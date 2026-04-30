// src/lib/actions/companies.ts
// Server Actions for Company CRUD – CRM v5 (fully typed + Zod validated)

"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteCompanyWithTrash, type TrashDeleteMode } from "@/lib/actions/crm-trash";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  analyzeInternalDuplicates,
  buildFirmennameOrFilter,
  buildWebsiteOrFilter,
  type CsvImportDbMatchResult,
  type CsvImportDuplicateExisting,
  type CsvImportDuplicateRowAnalysis,
  collectDedupeQueryBuckets,
  findDbDuplicateForRow,
  mergeDuplicateAnalyses,
} from "@/lib/companies/csv-import-dedupe";
import { syncContactUserIdsForCompany } from "@/lib/companies/sync-contact-user-ids";
import { normalizeLandInput } from "@/lib/countries/iso-land";
import { getMessagesForLocale, resolveAppLocale } from "@/lib/i18n/messages";
import { createInAppNotification } from "@/lib/services/in-app-notifications";
import { generateAndStoreCompanyEmbedding } from "@/lib/services/semantic-search";
import { createTimelineEntry } from "@/lib/services/timeline";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type ParsedCompanyRow, parseCoordinate } from "@/lib/utils/csv-import";
import { safeDisplay } from "@/lib/utils/data-format";
import {
  type GeocodeAddressResult,
  type GeocodeConfidence,
  type GeocodeFailureReason,
  geocodeAddress,
} from "@/lib/utils/geocode-nominatim";
import { type CompanyFormValues, companySchema, toCompanyInsert, toCompanyUpdate } from "@/lib/validations/company";
import { updateCompanyWithOwnerInputSchema } from "@/lib/validations/company-owner";
import { parsedCompanyRowsSchema } from "@/lib/validations/csv-import";
import type {
  Company,
  CompanyInsert,
  CompanyUpdate,
  Contact,
  KPI,
  TimelineEntryInsert,
} from "@/types/database.types";

export type CompanyForOpenMap = Company & {
  contacts?: Contact[];
};

const COMPANY_SEMANTIC_UPDATE_FIELDS: ReadonlySet<keyof CompanyUpdate> = new Set([
  "firmenname",
  "kundentyp",
  "firmentyp",
  "rechtsform",
  "strasse",
  "plz",
  "stadt",
  "bundesland",
  "land",
  "notes",
  "status",
  "wassertyp",
  "website",
  "email",
  "telefon",
]);

function toCompanySemanticInput(company: Company) {
  return {
    firmenname: company.firmenname,
    kundentyp: company.kundentyp,
    firmentyp: company.firmentyp,
    rechtsform: company.rechtsform,
    strasse: company.strasse,
    plz: company.plz,
    stadt: company.stadt,
    bundesland: company.bundesland,
    land: company.land,
    notes: company.notes,
    status: company.status,
    wassertyp: company.wassertyp,
    website: company.website,
    email: company.email,
    telefon: company.telefon,
  };
}

function shouldRegenerateCompanyEmbedding(updates: CompanyUpdate): boolean {
  const keys = Object.keys(updates) as (keyof CompanyUpdate)[];
  return keys.some((key) => COMPANY_SEMANTIC_UPDATE_FIELDS.has(key));
}

/** Placeholder for future transactional email when company ownership changes. */
async function placeholderNotifyCompanyOwnerEmail(_args: {
  newOwnerUserId: string;
  companyId: string;
  companyName: string;
}): Promise<void> {
  // TODO(email): company owner assignment (e.g. Brevo / SMTP)
}

/** Best-effort audit row on company detail timeline; does not throw (update already persisted). */
async function maybeAppendCompanyOwnershipTimelineAudit(params: {
  supabase: SupabaseClient;
  companyId: string;
  priorUserId: string | null;
  nextUserId: string | null;
  actorUserId: string;
}): Promise<void> {
  const { supabase, companyId, priorUserId, nextUserId, actorUserId } = params;
  if (priorUserId === nextUserId) {
    return;
  }

  const { companies: companiesMessages } = getMessagesForLocale(resolveAppLocale(undefined));
  const unassigned = companiesMessages.responsibleUnassigned;
  const unknownUser = companiesMessages.timelineOwnershipUnknownUser;

  const ids = [...new Set([priorUserId, nextUserId].filter((id): id is string => id != null && id !== ""))];
  const displayById = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: profiles, error } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    if (error) {
      console.error("[maybeAppendCompanyOwnershipTimelineAudit] profiles lookup failed", error);
    } else {
      for (const row of profiles ?? []) {
        displayById.set(row.id, row.display_name);
      }
    }
  }

  const labelFor = (userId: string | null) => {
    if (userId == null || userId === "") {
      return unassigned;
    }
    const dn = displayById.get(userId);
    const name = dn != null && dn.trim() !== "" ? dn.trim() : null;
    return name ?? safeDisplay(null, unknownUser);
  };

  const fromLabel = labelFor(priorUserId);
  const toLabel = labelFor(nextUserId);
  const title = companiesMessages.timelineOwnershipChangedTitle.replace("{from}", fromLabel).replace("{to}", toLabel);

  try {
    await createTimelineEntry(
      {
        title,
        content: null,
        activity_type: "other",
        company_id: companyId,
        contact_id: null,
        user_id: actorUserId,
        created_by: actorUserId,
        updated_by: actorUserId,
      },
      supabase,
    );
  } catch (err) {
    console.error("[maybeAppendCompanyOwnershipTimelineAudit] timeline insert failed", err);
  }
}

async function maybeNotifyNewCompanyOwner(params: {
  companyId: string;
  companyName: string;
  priorUserId: string | null;
  newUserId: string;
  actorUserId: string;
}): Promise<void> {
  const { companyId, companyName, priorUserId, newUserId, actorUserId } = params;
  if (newUserId === priorUserId) {
    return;
  }
  const { companies: companiesMessages } = getMessagesForLocale(resolveAppLocale(undefined));
  const title = companiesMessages.notificationNewOwnerTitle.replace("{companyName}", companyName);
  const body = companiesMessages.notificationNewOwnerBody;
  await createInAppNotification({
    type: "company_owner_assigned",
    userId: newUserId,
    title,
    body,
    payload: { companyId },
    actorUserId,
    dedupeKey: `company_owner_assigned:${companyId}:${newUserId}:${priorUserId ?? "none"}`,
  });
  await placeholderNotifyCompanyOwnerEmail({
    newOwnerUserId: newUserId,
    companyId,
    companyName,
  });
}

/** Placeholder for future transactional email when contact assignment changes. */
async function placeholderNotifyContactAssignedEmail(_args: {
  assigneeUserId: string;
  contactId: string;
  contactName: string;
}): Promise<void> {
  // TODO(email): contact assignment (e.g. Brevo / SMTP)
}

export async function maybeNotifyContactAssignment(params: {
  contactId: string;
  companyId: string | null;
  contactName: string;
  priorUserId: string | null;
  newUserId: string;
  actorUserId: string;
}): Promise<void> {
  const { contactId, companyId, contactName, priorUserId, newUserId, actorUserId } = params;
  if (newUserId === priorUserId || newUserId === "") {
    return;
  }
  if (actorUserId === newUserId) {
    return;
  }
  const { contacts: contactsMessages } = getMessagesForLocale(resolveAppLocale(undefined));
  const title = contactsMessages.notificationAssignedTitle.replace("{contactName}", contactName);
  const body = contactsMessages.notificationAssignedBody;
  const payload =
    companyId != null && companyId !== "" ? { contactId, companyId } : { contactId };
  await createInAppNotification({
    type: "contact_assigned",
    userId: newUserId,
    title,
    body,
    payload,
    actorUserId,
    dedupeKey: `contact_assigned:${contactId}:${newUserId}:${priorUserId ?? "none"}`,
  });
  await placeholderNotifyContactAssignedEmail({
    assigneeUserId: newUserId,
    contactId,
    contactName,
  });
}

/* ──────────────────────────────────────────────────────────────
   GET ALL COMPANIES FOR MAP
   ────────────────────────────────────────────────────────────── */
export async function getCompaniesForOpenMap(
  supabase: SupabaseClient
): Promise<CompanyForOpenMap[]> {
  const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      contacts (*)
    `)
    .is("deleted_at", null);

  if (error) throw handleSupabaseError(error, "getCompaniesForOpenMap");
  const rows = data ?? [];
  return rows.map((row) => ({
    ...row,
    contacts: (row.contacts ?? []).filter((c: { deleted_at?: string | null }) => c.deleted_at == null),
  })) as CompanyForOpenMap[];
}

/* ──────────────────────────────────────────────────────────────
   GET COMPANIES WITH PAGINATION + FILTERS
   ────────────────────────────────────────────────────────────── */
export async function getCompanies(
  supabase: SupabaseClient,
  options: {
    page?: number;
    pageSize?: number;
    statusFilters?: string[];
    kundentypFilters?: string[];
    firmentypFilters?: string[];
    landFilters?: string[];
    sortBy?: string;
    sortDesc?: boolean;
  } = {}
): Promise<{ data: Company[]; total: number }> {
  const {
    page = 0,
    pageSize = 20,
    statusFilters,
    kundentypFilters,
    firmentypFilters,
    landFilters,
    sortBy,
    sortDesc = false,
  } = options;

  let query = supabase.from("companies").select("*", { count: "exact" }).is("deleted_at", null);

  if (statusFilters?.length) query = query.in("status", statusFilters);
  if (kundentypFilters?.length) query = query.in("kundentyp", kundentypFilters);
  if (firmentypFilters?.length) query = query.in("firmentyp", firmentypFilters);
  if (landFilters?.length) query = query.in("land", landFilters);

  if (sortBy) {
    query = query.order(sortBy, { ascending: !sortDesc });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw handleSupabaseError(error, "getCompanies");

  return { data: data ?? [], total: count ?? 0 };
}

/* ──────────────────────────────────────────────────────────────
   RESOLVE COMPANY DETAIL (active vs Papierkorb vs missing)
   ────────────────────────────────────────────────────────────── */
export type ResolveCompanyDetailResult =
  | { kind: "active"; company: Company }
  | { kind: "trashed" }
  | { kind: "missing" };

export async function resolveCompanyDetail(
  id: string,
  supabase: SupabaseClient,
): Promise<ResolveCompanyDetailResult> {
  const { data, error } = await supabase
    .from("companies")
    .select(`
      id, firmenname, status, kundentyp, firmentyp, rechtsform, value,
      strasse, plz, stadt, bundesland, land, telefon, email, website,
      notes,
      lat, lon, osm, wasserdistanz, wassertyp, created_at, updated_at,
      deleted_at, user_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveCompanyDetail");

  if (data === null) {
    return { kind: "missing" };
  }

  if (data.deleted_at !== null && data.deleted_at !== undefined) {
    return { kind: "trashed" };
  }

  return { kind: "active", company: data as Company };
}

/* ──────────────────────────────────────────────────────────────
   CREATE COMPANY (Zod validated)
   ────────────────────────────────────────────────────────────── */
export async function createCompany(values: CompanyFormValues, supabase?: SupabaseClient): Promise<Company> {
  const validated = companySchema.safeParse(values);
  if (!validated.success) {
    throw new Error("Validierungsfehler beim Erstellen des Unternehmens");
  }

  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("Unauthorized");
  }

  const client = supabase ?? await createServerSupabaseClient();
  const insertData = toCompanyInsert(validated.data);

  insertData.user_id = user.id;
  insertData.created_by = user.id;
  insertData.updated_by = user.id;

  const { data, error } = await client.from("companies").insert(insertData).select().single();

  if (error) throw handleSupabaseError(error, "createCompany");
  const company = data as Company;
  void generateAndStoreCompanyEmbedding(client, company.id, toCompanySemanticInput(company));
  return company;
}

/* ──────────────────────────────────────────────────────────────
   UPDATE COMPANY (Zod validated)
   ────────────────────────────────────────────────────────────── */
export async function updateCompany(
  id: string,
  updates: CompanyUpdate,
): Promise<Company> {
  const supabase = await createServerSupabaseClient();

  const { data: priorRow, error: priorError } = await supabase
    .from("companies")
    .select("user_id, firmenname")
    .eq("id", id)
    .maybeSingle();

  if (priorError) throw handleSupabaseError(priorError, "updateCompany");

  if (priorRow === null) {
    throw new Error("Company not found");
  }

  const actor = await getCurrentUser();
  const patch: CompanyUpdate =
    actor != null ? { ...updates, updated_by: actor.id } : { ...updates };

  const { data, error } = await supabase.from("companies").update(patch).eq("id", id).select().single();

  if (error) throw handleSupabaseError(error, "updateCompany");
  const company = data as Company;
  if (shouldRegenerateCompanyEmbedding(updates)) {
    void generateAndStoreCompanyEmbedding(supabase, company.id, toCompanySemanticInput(company));
  }

  if ("user_id" in updates && actor != null) {
    const nextUserId = updates.user_id ?? null;
    await maybeAppendCompanyOwnershipTimelineAudit({
      supabase,
      companyId: id,
      priorUserId: priorRow.user_id,
      nextUserId,
      actorUserId: actor.id,
    });
  }

  const newUserId = updates.user_id;
  if (newUserId !== undefined && newUserId !== null && priorRow != null && actor != null) {
    await maybeNotifyNewCompanyOwner({
      companyId: id,
      companyName: company.firmenname,
      priorUserId: priorRow.user_id,
      newUserId,
      actorUserId: actor.id,
    });
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`, "page");
  return company;
}

/**
 * Validates company form fields plus `user_id` and optional bulk contact owner sync.
 */
export async function updateCompanyWithOwner(raw: unknown): Promise<Company> {
  const input = updateCompanyWithOwnerInputSchema.parse(raw);
  const actor = await getCurrentUser();
  if (actor == null) {
    throw new Error("Unauthorized");
  }

  const updates: CompanyUpdate = {
    ...toCompanyUpdate(input.company),
    user_id: input.user_id,
  };
  const company = await updateCompany(input.id, updates);

  if (input.sync_contact_owners && input.user_id != null && input.user_id !== "") {
    const supabase = await createServerSupabaseClient();
    await syncContactUserIdsForCompany(supabase, input.id, input.user_id, actor.id);
    revalidatePath("/contacts");
  }

  return company;
}

/* ──────────────────────────────────────────────────────────────
   DELETE COMPANY (soft or hard via user trash_bin_enabled)
   ────────────────────────────────────────────────────────────── */
export async function deleteCompany(id: string): Promise<TrashDeleteMode> {
  return deleteCompanyWithTrash(id);
}

/* ──────────────────────────────────────────────────────────────
   GET KPI SUMMARY
   ────────────────────────────────────────────────────────────── */
export async function getKpis(supabase: SupabaseClient): Promise<KPI[]> {
  const { data, error } = await supabase.from("companies").select("status").is("deleted_at", null);

  if (error) throw handleSupabaseError(error, "getKpis");

  const total = data.length;
  const won = data.filter((c) => c.status === "gewonnen").length;
  const lost = data.filter((c) => c.status === "verloren").length;
  const lead = data.filter((c) => c.status === "lead").length;

  return [
    { title: "Total Companies", value: total, changePercent: 0, subtitle: "Alle Unternehmen" },
    { title: "Gewonnen", value: won, changePercent: 12, subtitle: "Erfolgreich abgeschlossen" },
    { title: "Verloren", value: lost, changePercent: -8, subtitle: "Verlorene Opportunities" },
    { title: "Leads", value: lead, changePercent: 15, subtitle: "Aktive Leads" },
  ];
}

/* ──────────────────────────────────────────────────────────────
   CSV IMPORT
   ────────────────────────────────────────────────────────────── */
function validCoordOrNull(value: number | null | undefined, min: number, max: number): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

const CSV_IMPORT_DEDUPE_SELECT = "id,firmenname,stadt,plz,website,osm";

async function loadCsvImportDedupeCandidates(
  supabase: SupabaseClient,
  rows: ParsedCompanyRow[],
): Promise<CsvImportDuplicateExisting[]> {
  const buckets = collectDedupeQueryBuckets(rows);
  const byId = new Map<string, CsvImportDuplicateExisting>();

  const ingest = (data: CsvImportDuplicateExisting[] | null) => {
    for (const c of data ?? []) {
      byId.set(c.id, c);
    }
  };

  if (buckets.osms.length > 0) {
    const { data, error } = await supabase
      .from("companies")
      .select(CSV_IMPORT_DEDUPE_SELECT)
      .is("deleted_at", null)
      .in("osm", buckets.osms);
    if (error) throw handleSupabaseError(error, "loadCsvImportDedupeCandidates:osm");
    ingest(data as CsvImportDuplicateExisting[]);
  }

  if (buckets.plzs.length > 0) {
    const { data, error } = await supabase
      .from("companies")
      .select(CSV_IMPORT_DEDUPE_SELECT)
      .is("deleted_at", null)
      .in("plz", buckets.plzs);
    if (error) throw handleSupabaseError(error, "loadCsvImportDedupeCandidates:plz");
    ingest(data as CsvImportDuplicateExisting[]);
  }

  const websiteOr = buildWebsiteOrFilter(buckets.hosts);
  if (websiteOr !== null) {
    const { data, error } = await supabase
      .from("companies")
      .select(CSV_IMPORT_DEDUPE_SELECT)
      .is("deleted_at", null)
      .or(websiteOr);
    if (error) throw handleSupabaseError(error, "loadCsvImportDedupeCandidates:website");
    ingest(data as CsvImportDuplicateExisting[]);
  }

  const nameOr = buildFirmennameOrFilter(buckets.nameOnlyNormalizedNames);
  if (nameOr !== null) {
    const { data, error } = await supabase
      .from("companies")
      .select(CSV_IMPORT_DEDUPE_SELECT)
      .is("deleted_at", null)
      .or(nameOr);
    if (error) throw handleSupabaseError(error, "loadCsvImportDedupeCandidates:name");
    ingest(data as CsvImportDuplicateExisting[]);
  }

  return [...byId.values()];
}

export type PreviewCsvImportDuplicatesResult =
  | { ok: true; analyses: CsvImportDuplicateRowAnalysis[] }
  | { ok: false; error: string };

export async function previewCsvImportDuplicates(
  rows: ParsedCompanyRow[],
): Promise<PreviewCsvImportDuplicatesResult> {
  const parsed = parsedCompanyRowsSchema.safeParse(rows);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const user = await getCurrentUser();
  if (user == null) {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = await createServerSupabaseClient();
  try {
    const candidates = await loadCsvImportDedupeCandidates(supabase, parsed.data);
    const dbMatches = new Map<number, CsvImportDbMatchResult>();
    parsed.data.forEach((row, index) => {
      dbMatches.set(index, findDbDuplicateForRow(row, candidates));
    });
    const internalMap = analyzeInternalDuplicates(parsed.data);
    const analyses = mergeDuplicateAnalyses(parsed.data.length, dbMatches, internalMap);
    return { ok: true, analyses };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Duplicate check failed",
    };
  }
}

export type ImportCompaniesFromCsvOptions = {
  forceImportRowIndices?: number[];
  /** Row indices to skip even when otherwise eligible (preview user choice). */
  excludeImportRowIndices?: number[];
};

function parsedCompanyRowLandForDb(row: ParsedCompanyRow): string | null {
  const trimmed = row.land?.trim();
  if (trimmed === undefined || trimmed === "") {
    return null;
  }
  const normalized = normalizeLandInput(trimmed);
  return normalized.ok ? normalized.code : null;
}

function mapParsedRowToCompanyInsert(
  row: ParsedCompanyRow,
  userId: string,
  importBatch: string,
): CompanyInsert {
  return {
    firmenname: row.firmenname,
    kundentyp: row.kundentyp,
    strasse: row.strasse ?? null,
    plz: row.plz ?? null,
    stadt: row.ort ?? null,
    bundesland: row.bundesland ?? null,
    land: parsedCompanyRowLandForDb(row),
    telefon: row.telefon ?? null,
    website: row.website ?? null,
    email: row.email ?? null,
    lat: validCoordOrNull(row.lat, -90, 90),
    lon: validCoordOrNull(row.lon, -180, 180),
    osm: row.osm ?? null,
    wasserdistanz: row.wasser_distanz ?? null,
    wassertyp: row.wassertyp ?? null,
    status: "lead",
    user_id: userId,
    created_by: userId,
    updated_by: userId,
    rechtsform: null,
    firmentyp: null,
    value: null,
    notes: null,
    import_batch: importBatch,
  };
}

/** Best-effort: does not throw; import success must not depend on timeline writes. */
async function createCsvImportTimelineEntries(
  supabase: SupabaseClient,
  companyIds: string[],
): Promise<void> {
  if (companyIds.length === 0) {
    return;
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return;
    }

    const rows: TimelineEntryInsert[] = companyIds.map((companyId) => ({
      title: "CSV Import: Unternehmen importiert",
      content: null,
      activity_type: "import",
      company_id: companyId,
      contact_id: null,
      user_id: user.id,
      created_by: user.id,
      updated_by: user.id,
    }));

    const { error } = await supabase.from("timeline").insert(rows);

    if (error !== null) {
      console.error("[createCsvImportTimelineEntries] timeline insert failed:", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (err: unknown) {
    console.error("[createCsvImportTimelineEntries] unexpected error:", err);
  }
}

export async function importCompaniesFromCSV(
  rows: ParsedCompanyRow[],
  options?: ImportCompaniesFromCsvOptions,
): Promise<{
  imported: number;
  importedWithCoordinates: number;
  skippedDuplicates: number;
  skippedUserExcluded: number;
  errors: string[];
  importBatch: string;
  companyIds: string[];
}> {
  const supabase = await createServerSupabaseClient();
  const importBatch = new Date().toISOString();

  const user = await getCurrentUser();
  if (user == null) {
    return {
      imported: 0,
      importedWithCoordinates: 0,
      skippedDuplicates: 0,
      skippedUserExcluded: 0,
      errors: ["Unauthorized"],
      importBatch,
      companyIds: [],
    };
  }

  const validated = parsedCompanyRowsSchema.safeParse(rows);
  if (!validated.success) {
    return {
      imported: 0,
      importedWithCoordinates: 0,
      skippedDuplicates: 0,
      skippedUserExcluded: 0,
      errors: validated.error.issues.map((i) => i.message),
      importBatch,
      companyIds: [],
    };
  }

  const forceRaw = options?.forceImportRowIndices ?? [];
  const forceSet = new Set(forceRaw.filter((i) => Number.isInteger(i) && i >= 0));
  const excludeRaw = options?.excludeImportRowIndices ?? [];
  const excludeSet = new Set(excludeRaw.filter((i) => Number.isInteger(i) && i >= 0));

  try {
    const dataRows = validated.data;
    const candidates = await loadCsvImportDedupeCandidates(supabase, dataRows);
    const internalMap = analyzeInternalDuplicates(dataRows);

    const landErrors: string[] = [];
    for (let i = 0; i < dataRows.length; i += 1) {
      const row = dataRows[i];
      if (row === undefined) {
        continue;
      }
      const dbMatch = findDbDuplicateForRow(row, candidates);
      const internalDup = internalMap.get(i) ?? null;
      const needsReview = dbMatch !== null || internalDup !== null;
      if (excludeSet.has(i)) {
        continue;
      }
      if (needsReview && !forceSet.has(i)) {
        continue;
      }
      const trimmedLand = row.land?.trim();
      if (trimmedLand !== undefined && trimmedLand !== "") {
        const normalized = normalizeLandInput(trimmedLand);
        if (!normalized.ok) {
          landErrors.push(
            `Zeile ${String(i + 1)} (${row.firmenname}): Land „${trimmedLand}“ ist ungültig oder nicht unterstützt.`,
          );
        }
      }
    }

    if (landErrors.length > 0) {
      return {
        imported: 0,
        importedWithCoordinates: 0,
        skippedDuplicates: 0,
        skippedUserExcluded: 0,
        errors: landErrors,
        importBatch,
        companyIds: [],
      };
    }

    const companiesToInsert: CompanyInsert[] = [];
    let skippedDuplicates = 0;
    let skippedUserExcluded = 0;

    for (let i = 0; i < dataRows.length; i += 1) {
      const row = dataRows[i];
      if (row === undefined) continue;
      const dbMatch = findDbDuplicateForRow(row, candidates);
      const internalDup = internalMap.get(i) ?? null;
      const needsReview = dbMatch !== null || internalDup !== null;

      if (excludeSet.has(i)) {
        skippedUserExcluded += 1;
        continue;
      }

      if (needsReview && !forceSet.has(i)) {
        skippedDuplicates += 1;
        continue;
      }

      companiesToInsert.push(mapParsedRowToCompanyInsert(row, user.id, importBatch));
    }

    const importedWithCoordinates = companiesToInsert.filter(
      (row) => row.lat !== null && row.lon !== null,
    ).length;

    if (companiesToInsert.length === 0) {
      return {
        imported: 0,
        importedWithCoordinates: 0,
        skippedDuplicates,
        skippedUserExcluded,
        errors: [],
        importBatch,
        companyIds: [],
      };
    }

    const { data, error } = await supabase.from("companies").insert(companiesToInsert).select();

    if (error) throw handleSupabaseError(error, "importCompaniesFromCSV");

    const companyIds = (data ?? []).map((row) => row.id);
    const insertedCompanies = (data ?? []) as Company[];

    for (const company of insertedCompanies) {
      void generateAndStoreCompanyEmbedding(supabase, company.id, toCompanySemanticInput(company));
    }

    await createCsvImportTimelineEntries(supabase, companyIds);

    return {
      imported: data?.length || 0,
      importedWithCoordinates,
      skippedDuplicates,
      skippedUserExcluded,
      errors: [],
      importBatch,
      companyIds,
    };
  } catch (error) {
    return {
      imported: 0,
      importedWithCoordinates: 0,
      skippedDuplicates: 0,
      skippedUserExcluded: 0,
      errors: [error instanceof Error ? error.message : "Unbekannter Importfehler"],
      importBatch,
      companyIds: [],
    };
  }
}

/* ──────────────────────────────────────────────────────────────
   NOMINATIM GEOCODE (preview + selective apply)
   ────────────────────────────────────────────────────────────── */

const GEOCODE_BATCH_MAX = 50;
const GEOCODE_REQUEST_GAP_MS = 1100;

export type GeocodeBatchPreviewRow = {
  rowId: string;
  companyId: string | null;
  firmenname: string | null;
  addressLabel: string;
  currentLat: number | null;
  currentLon: number | null;
  suggestedLat: number | null;
  suggestedLon: number | null;
  confidence: GeocodeConfidence | null;
  importance: number | null;
  displayName: string | null;
  ok: boolean;
  message: string | null;
};

const geocodeBatchItemSchema = z
  .object({
    rowId: z.string().trim().min(1),
    companyId: z.string().uuid().optional(),
    firmenname: z.string().trim().optional(),
    strasse: z.string().trim().nullable().optional(),
    plz: z.string().trim().nullable().optional(),
    stadt: z.string().trim().nullable().optional(),
    land: z.string().trim().nullable().optional(),
    currentLat: z.number().finite().nullable().optional(),
    currentLon: z.number().finite().nullable().optional(),
  })
  .strict();

const geocodeCompanyBatchInputSchema = z
  .object({
    items: z.array(geocodeBatchItemSchema).min(1).max(GEOCODE_BATCH_MAX),
  })
  .strict();

function geocodeFailureMessage(reason: GeocodeFailureReason | null): string {
  switch (reason) {
    case "INCOMPLETE_ADDRESS":
      return "Adresse unvollständig: Bitte Straße oder PLZ sowie Ort angeben.";
    case "NETWORK_ERROR":
      return "Geocoding-Dienst vorübergehend nicht erreichbar.";
    case "INVALID_COORDINATE":
      return "Ungültige Koordinaten in der Antwort.";
    case "NO_RESULT":
      return "Kein Treffer für diese Adresse.";
    default:
      return "Geocoding fehlgeschlagen.";
  }
}

export type GeocodeCompanyBatchResult =
  | { ok: true; previewOnly: true; results: GeocodeBatchPreviewRow[] }
  | { ok: false; error: string };

export async function geocodeCompanyBatch(input: unknown): Promise<GeocodeCompanyBatchResult> {
  const parsed = geocodeCompanyBatchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe für Geocoding." };
  }

  const cache = new Map<string, GeocodeAddressResult>();
  const results: GeocodeBatchPreviewRow[] = [];

  for (let index = 0; index < parsed.data.items.length; index += 1) {
    if (index > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, GEOCODE_REQUEST_GAP_MS);
      });
    }

    const item = parsed.data.items[index];
    if (item === undefined) {
      continue;
    }

    const geo = await geocodeAddress(
      {
        strasse: item.strasse,
        plz: item.plz,
        stadt: item.stadt,
        land: item.land,
      },
      cache,
    );

    const currentLat =
      item.currentLat === undefined || item.currentLat === null ? null : item.currentLat;
    const currentLon =
      item.currentLon === undefined || item.currentLon === null ? null : item.currentLon;

    const addressParts = [
      item.strasse?.trim(),
      item.plz?.trim(),
      item.stadt?.trim(),
      item.land?.trim(),
    ].filter((part): part is string => typeof part === "string" && part.length > 0);
    const addressLabel = addressParts.length > 0 ? addressParts.join(", ") : "—";

    results.push({
      rowId: item.rowId,
      companyId: item.companyId ?? null,
      firmenname: item.firmenname ?? null,
      addressLabel,
      currentLat,
      currentLon,
      suggestedLat: geo.ok ? geo.lat : null,
      suggestedLon: geo.ok ? geo.lon : null,
      confidence: geo.confidence,
      importance: geo.importance,
      displayName: geo.displayName,
      ok: geo.ok,
      message: geo.ok ? null : geocodeFailureMessage(geo.reason),
    });
  }

  return { ok: true, previewOnly: true, results };
}

const applyGeocodeItemSchema = z
  .object({
    companyId: z.string().uuid().optional(),
    rowId: z.string().trim().min(1).optional(),
    suggestedLat: z.number().finite(),
    suggestedLon: z.number().finite(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.companyId === undefined && val.rowId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entweder companyId oder rowId ist erforderlich.",
        path: ["companyId"],
      });
    }
  });

const applyApprovedGeocodesInputSchema = z
  .object({
    items: z.array(applyGeocodeItemSchema).min(1),
  })
  .strict();

export type ApplyGeocodeItemResult =
  | {
      ok: true;
      companyId?: string;
      rowId?: string;
      lat: number;
      lon: number;
    }
  | {
      ok: false;
      companyId?: string;
      rowId?: string;
      error: string;
    };

export type ApplyApprovedGeocodesResult =
  | { ok: true; results: ApplyGeocodeItemResult[] }
  | { ok: false; error: string };

export async function applyApprovedGeocodes(input: unknown): Promise<ApplyApprovedGeocodesResult> {
  const parsed = applyApprovedGeocodesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe für Koordinaten-Übernahme." };
  }

  const results: ApplyGeocodeItemResult[] = [];
  let wroteCompany = false;

  for (const item of parsed.data.items) {
    const lat = parseCoordinate(String(item.suggestedLat), "lat");
    const lon = parseCoordinate(String(item.suggestedLon), "lon");

    if (lat === undefined || lon === undefined) {
      results.push({
        ok: false,
        companyId: item.companyId,
        rowId: item.rowId,
        error: "Koordinaten außerhalb des gültigen Bereichs oder ungültig.",
      });
      continue;
    }

    if (item.companyId !== undefined) {
      try {
        await updateCompany(item.companyId, { lat, lon });
        wroteCompany = true;
        results.push({
          ok: true,
          companyId: item.companyId,
          lat,
          lon,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update fehlgeschlagen.";
        results.push({
          ok: false,
          companyId: item.companyId,
          error: message,
        });
      }
      continue;
    }

    if (item.rowId !== undefined) {
      results.push({
        ok: true,
        rowId: item.rowId,
        lat,
        lon,
      });
      continue;
    }

    results.push({
      ok: false,
      error: "rowId oder companyId erforderlich.",
    });
  }

  if (wroteCompany) {
    revalidatePath("/companies", "page");
  }

  return { ok: true, results };
}
