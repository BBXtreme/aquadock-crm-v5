"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { hasRole } from "@/lib/auth/types";
import {
  buildCompanySemanticDocument,
  type CompanySemanticDocumentInput,
  generateAndStoreCompanyEmbedding,
  generateAndStoreCompanyEmbeddingWithSettings,
  hasEmbeddingProviderCredentials,
  resolveSemanticSearchSettings,
} from "@/lib/services/semantic-search";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const RE_EMBED_PAGE_SIZE = 50;
const RE_EMBED_MAX_TOTAL = 2000;
const RE_EMBED_ALL_MAX_TOTAL = 8000;

export type ReEmbedOwnCompaniesResult =
  | { ok: true; processed: number; skipped: number; total: number }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "SEMANTIC_DISABLED" | "NOT_CONFIGURED" | "NO_COMPANIES" | "FAILED";
    };

export type OwnCompanyCountResult =
  | { ok: true; total: number }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FAILED";
    };

export async function getOwnCompanyCountForReEmbedAction(): Promise<OwnCompanyCountResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("companies")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    throw handleSupabaseError(error, "getOwnCompanyCountForReEmbedAction");
  }

  return { ok: true, total: count ?? 0 };
}

export type AllCompanyCountResult =
  | { ok: true; total: number }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "FAILED";
    };

export async function getAllCompanyCountForReEmbedAction(): Promise<AllCompanyCountResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "UNAUTHORIZED" };
  }
  if (!hasRole(user, "admin")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("companies")
    .select("id", { head: true, count: "exact" })
    .is("deleted_at", null);

  if (error) {
    throw handleSupabaseError(error, "getAllCompanyCountForReEmbedAction");
  }

  return { ok: true, total: count ?? 0 };
}

export async function reEmbedOwnCompaniesAction(): Promise<ReEmbedOwnCompaniesResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const supabase = await createServerSupabaseClient();
  const settings = await resolveSemanticSearchSettings(supabase);
  if (!settings.semanticSearchEnabled) {
    return { ok: false, error: "SEMANTIC_DISABLED" };
  }
  if (!hasEmbeddingProviderCredentials(settings)) {
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const { count: total, error: countError } = await supabase
    .from("companies")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null);
  if (countError) {
    throw handleSupabaseError(countError, "reEmbedOwnCompaniesAction:count");
  }

  const { data: rows, error } = await supabase
    .from("companies")
    .select(
      "id, firmenname, kundentyp, firmentyp, rechtsform, strasse, plz, stadt, bundesland, land, notes, status, wassertyp, website, email, telefon",
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(RE_EMBED_MAX_TOTAL);

  if (error) {
    throw handleSupabaseError(error, "reEmbedOwnCompaniesAction");
  }

  if (!rows?.length) {
    return { ok: false, error: "NO_COMPANIES" };
  }

  let processed = 0;
  let skipped = 0;

  for (const row of rows) {
    const input: CompanySemanticDocumentInput = {
      firmenname: row.firmenname,
      kundentyp: row.kundentyp,
      firmentyp: row.firmentyp,
      rechtsform: row.rechtsform,
      strasse: row.strasse,
      plz: row.plz,
      stadt: row.stadt,
      bundesland: row.bundesland,
      land: row.land,
      notes: row.notes,
      status: row.status,
      wassertyp: row.wassertyp,
      website: row.website,
      email: row.email,
      telefon: row.telefon,
    };
    const doc = buildCompanySemanticDocument(input);
    if (doc.length < 10) {
      skipped += 1;
      continue;
    }
    await generateAndStoreCompanyEmbedding(supabase, row.id, input, undefined, { force: true });
    processed += 1;
    if (processed % RE_EMBED_PAGE_SIZE === 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return { ok: true, processed, skipped, total: total ?? rows.length };
}

export type ReEmbedAllCompaniesResult =
  | { ok: true; processed: number; skipped: number; total: number }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "SEMANTIC_DISABLED"
        | "NOT_CONFIGURED"
        | "NO_COMPANIES"
        | "FAILED";
    };

export async function reEmbedAllCompaniesAction(): Promise<ReEmbedAllCompaniesResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "UNAUTHORIZED" };
  }
  if (!hasRole(user, "admin")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const supabaseForSettings = await createServerSupabaseClient();
  const settings = await resolveSemanticSearchSettings(supabaseForSettings);
  if (!settings.semanticSearchEnabled) {
    return { ok: false, error: "SEMANTIC_DISABLED" };
  }
  if (!hasEmbeddingProviderCredentials(settings)) {
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const admin = createAdminClient();

  const rows: Array<{
    id: string;
    firmenname: string;
    kundentyp: string | null;
    firmentyp: string | null;
    rechtsform: string | null;
    strasse: string | null;
    plz: string | null;
    stadt: string | null;
    bundesland: string | null;
    land: string | null;
    notes: string | null;
    status: string | null;
    wassertyp: string | null;
    website: string | null;
    email: string | null;
    telefon: string | null;
  }> = [];

  for (let offset = 0; offset < RE_EMBED_ALL_MAX_TOTAL; offset += RE_EMBED_PAGE_SIZE) {
    const { data, error } = await admin
      .from("companies")
      .select(
        "id, firmenname, kundentyp, firmentyp, rechtsform, strasse, plz, stadt, bundesland, land, notes, status, wassertyp, website, email, telefon",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + RE_EMBED_PAGE_SIZE - 1);

    if (error) {
      throw handleSupabaseError(error, "reEmbedAllCompaniesAction");
    }

    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < RE_EMBED_PAGE_SIZE) {
      break;
    }
  }

  if (!rows.length) {
    return { ok: false, error: "NO_COMPANIES" };
  }

  let processed = 0;
  let skipped = 0;

  for (const row of rows) {
    const input: CompanySemanticDocumentInput = {
      firmenname: row.firmenname,
      kundentyp: row.kundentyp,
      firmentyp: row.firmentyp,
      rechtsform: row.rechtsform,
      strasse: row.strasse,
      plz: row.plz,
      stadt: row.stadt,
      bundesland: row.bundesland,
      land: row.land,
      notes: row.notes,
      status: row.status,
      wassertyp: row.wassertyp,
      website: row.website,
      email: row.email,
      telefon: row.telefon,
    };
    const doc = buildCompanySemanticDocument(input);
    if (doc.length < 10) {
      skipped += 1;
      continue;
    }

    await generateAndStoreCompanyEmbeddingWithSettings(admin, row.id, input, settings, undefined, { force: true });
    processed += 1;

    if (processed % RE_EMBED_PAGE_SIZE === 0) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return { ok: true, processed, skipped, total: rows.length };
}
