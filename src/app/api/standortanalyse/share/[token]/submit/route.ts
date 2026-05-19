import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSimpleRateLimit, getRequestIpAddress } from "@/lib/security/simple-rate-limit";
import { sendNotificationHtmlEmail } from "@/lib/services/smtp-delivery";
import {
  toStandortanalyseScoresInsert,
  toStandortanalyseUpdate,
} from "@/lib/standortanalyse/persistence";
import { calculateStandortScore } from "@/lib/standortanalyse/scoring";
import { hashShareToken, verifySharePassword } from "@/lib/standortanalyse/share";
import { buildStandortanalyseSubmissionConfirmationEmailContent } from "@/lib/standortanalyse/share-invite-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { standortanalyseFormSchema } from "@/lib/validations/standortanalyse";

const submitSharedAnalysisSchema = z
  .object({
    password: z.string().trim().min(1, "Passwort erforderlich").optional(),
    createOrUpdateContact: z.boolean().default(false),
    formData: standortanalyseFormSchema,
  })
  .strict();

async function maybeCreateOrUpdateContactForOwner(args: {
  ownerUserId: string;
  formData: z.infer<typeof standortanalyseFormSchema>;
  companyId: string | null;
}) {
  const admin = createAdminClient();
  const email = args.formData.kontakt.email.trim().toLowerCase();

  const { data: existingContact, error: existingError } = await admin
    .from("contacts")
    .select("id,company_id")
    .eq("user_id", args.ownerUserId)
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingContact == null) {
    const { data: insertedContact, error: insertError } = await admin
      .from("contacts")
      .insert({
        user_id: args.ownerUserId,
        company_id: args.companyId,
        vorname: args.formData.kontakt.vorname,
        nachname: args.formData.kontakt.name,
        email,
        telefon: args.formData.kontakt.telefon ?? null,
        notes: "Erstellt über öffentliche Standortanalyse",
        created_by: args.ownerUserId,
        updated_by: args.ownerUserId,
      })
      .select("id")
      .single();

    if (insertError || insertedContact == null) {
      throw new Error(insertError?.message ?? "Kontakt konnte nicht erstellt werden");
    }
    return insertedContact.id;
  }

  const { error: updateError } = await admin
    .from("contacts")
    .update({
      vorname: args.formData.kontakt.vorname,
      nachname: args.formData.kontakt.name,
      telefon: args.formData.kontakt.telefon ?? null,
      company_id: args.companyId ?? existingContact.company_id ?? null,
      updated_by: args.ownerUserId,
    })
    .eq("id", existingContact.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
  return existingContact.id;
}

async function maybeCreateOrUpdateCompanyForOwner(args: {
  ownerUserId: string;
  formData: z.infer<typeof standortanalyseFormSchema>;
}) {
  const companyName = args.formData.kontakt.firma?.trim() ?? "";
  if (companyName.length === 0) {
    return null;
  }

  const admin = createAdminClient();
  const { data: existingCompanies, error: existingError } = await admin
    .from("companies")
    .select("id")
    .eq("user_id", args.ownerUserId)
    .ilike("firmenname", companyName)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingCompanyId = existingCompanies?.[0]?.id;
  if (existingCompanyId == null) {
    const { data: insertedCompany, error: insertError } = await admin
      .from("companies")
      .insert({
        user_id: args.ownerUserId,
        firmenname: companyName,
        email: args.formData.kontakt.email,
        telefon: args.formData.kontakt.telefon ?? null,
        strasse: args.formData.standort.strasse ?? null,
        plz: args.formData.standort.plz,
        stadt: args.formData.standort.ort,
        land: args.formData.standort.land,
        wassertyp: args.formData.kriterien.gewaesserart,
        notes: "Erstellt über öffentliche Standortanalyse",
        created_by: args.ownerUserId,
        updated_by: args.ownerUserId,
      })
      .select("id")
      .single();

    if (insertError || insertedCompany == null) {
      throw new Error(insertError?.message ?? "Firma konnte nicht erstellt werden");
    }
    return insertedCompany.id;
  }

  const { error: updateError } = await admin
    .from("companies")
    .update({
      firmenname: companyName,
      email: args.formData.kontakt.email,
      telefon: args.formData.kontakt.telefon ?? null,
      strasse: args.formData.standort.strasse ?? null,
      plz: args.formData.standort.plz,
      stadt: args.formData.standort.ort,
      land: args.formData.standort.land,
      wassertyp: args.formData.kriterien.gewaesserart,
      updated_by: args.ownerUserId,
    })
    .eq("id", existingCompanyId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return existingCompanyId;
}

async function syncCrmEntitiesForOwner(args: {
  ownerUserId: string;
  analysisId: string;
  formData: z.infer<typeof standortanalyseFormSchema>;
}) {
  const companyId = await maybeCreateOrUpdateCompanyForOwner({
    ownerUserId: args.ownerUserId,
    formData: args.formData,
  });
  const contactId = await maybeCreateOrUpdateContactForOwner({
    ownerUserId: args.ownerUserId,
    formData: args.formData,
    companyId,
  });

  const admin = createAdminClient();
  const { error: linkError } = await admin
    .from("standortanalysen")
    .update({
      contact_id: contactId,
      company_id: companyId,
    })
    .eq("id", args.analysisId);

  if (linkError) {
    throw new Error(linkError.message);
  }

  return { contactId, companyId };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ip = getRequestIpAddress(request);
  const rate = enforceSimpleRateLimit({
    key: `standortanalyse-share-submit:${token}:${ip}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const parsed = submitSharedAnalysisSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Ungültiger Request-Body",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const tokenHash = hashShareToken(token);
  const admin = createAdminClient();

  const { data: shareLink, error: shareError } = await admin
    .from("standortanalyse_share_links")
    .select("id, analysis_id, password_hash, expires_at, max_uses, used_count, is_active, standortanalysen(user_id)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (shareError || shareLink == null) {
    return NextResponse.json({ error: "Share-Link ungültig" }, { status: 404 });
  }

  if (!shareLink.is_active) {
    return NextResponse.json({ error: "Share-Link ist deaktiviert" }, { status: 410 });
  }

  if (new Date(shareLink.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Share-Link ist abgelaufen" }, { status: 410 });
  }

  if (shareLink.used_count >= shareLink.max_uses) {
    return NextResponse.json({ error: "Share-Link wurde bereits verwendet" }, { status: 410 });
  }

  if (shareLink.password_hash != null) {
    const providedPassword = parsed.data.password ?? "";
    const validPassword = verifySharePassword(providedPassword, shareLink.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: "Passwort ungültig" }, { status: 401 });
    }
  }

  const ownerUserId = shareLink.standortanalysen?.user_id;
  if (ownerUserId == null || ownerUserId === "") {
    return NextResponse.json({ error: "Analyse-Besitzer nicht gefunden" }, { status: 500 });
  }

  const score = calculateStandortScore(parsed.data.formData.kriterien);
  const analysisUpdate = toStandortanalyseUpdate(parsed.data.formData, score);
  const { error: updateAnalysisError } = await admin
    .from("standortanalysen")
    .update({
      ...analysisUpdate,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", shareLink.analysis_id);

  if (updateAnalysisError) {
    return NextResponse.json({ error: updateAnalysisError.message }, { status: 500 });
  }

  const { error: deleteScoresError } = await admin
    .from("standortanalyse_scores")
    .delete()
    .eq("analysis_id", shareLink.analysis_id);
  if (deleteScoresError) {
    return NextResponse.json({ error: deleteScoresError.message }, { status: 500 });
  }

  const scoreRows = toStandortanalyseScoresInsert(shareLink.analysis_id, score, parsed.data.formData);
  if (scoreRows.length > 0) {
    const { error: insertScoresError } = await admin
      .from("standortanalyse_scores")
      .insert(scoreRows);
    if (insertScoresError) {
      return NextResponse.json({ error: insertScoresError.message }, { status: 500 });
    }
  }

  const nextUsedCount = shareLink.used_count + 1;
  const { error: updateShareError } = await admin
    .from("standortanalyse_share_links")
    .update({
      used_count: nextUsedCount,
      last_accessed_at: new Date().toISOString(),
      is_active: nextUsedCount < shareLink.max_uses,
    })
    .eq("id", shareLink.id);

  if (updateShareError) {
    return NextResponse.json({ error: updateShareError.message }, { status: 500 });
  }

  if (parsed.data.createOrUpdateContact) {
    await syncCrmEntitiesForOwner({
      ownerUserId,
      analysisId: shareLink.analysis_id,
      formData: parsed.data.formData,
    });
  }

  const externalEmail = parsed.data.formData.kontakt.email;
  if (externalEmail.trim() !== "") {
    const confirmationEmail = buildStandortanalyseSubmissionConfirmationEmailContent({
      analysisId: shareLink.analysis_id,
    });
    await sendNotificationHtmlEmail({
      actingAdminUserId: ownerUserId,
      to: [externalEmail],
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      text: confirmationEmail.text,
    });
  }

  const { data: ownerAuth } = await admin.auth.admin.getUserById(ownerUserId);
  const ownerEmail = ownerAuth.user?.email;
  if (ownerEmail != null && ownerEmail.trim() !== "") {
    await sendNotificationHtmlEmail({
      actingAdminUserId: ownerUserId,
      to: [ownerEmail],
      subject: "Neue öffentliche Standortanalyse eingegangen",
      html: `<p>Eine öffentliche Standortanalyse wurde eingereicht.</p><p>ID: <strong>${shareLink.analysis_id}</strong></p><p>Punkte: <strong>${score.totalPoints}</strong></p>`,
      text: `Neue öffentliche Standortanalyse eingegangen. ID: ${shareLink.analysis_id}. Punkte: ${score.totalPoints}`,
    });
  }

  return NextResponse.json({
    success: true,
    analysisId: shareLink.analysis_id,
  });
}
