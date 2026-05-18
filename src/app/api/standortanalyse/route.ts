import { NextResponse } from "next/server";
import { z } from "zod";
import { sendNotificationHtmlEmail } from "@/lib/services/smtp-delivery";
import {
  toStandortanalyseInsert,
  toStandortanalyseScoresInsert,
  toStandortanalyseUpdate,
} from "@/lib/standortanalyse/persistence";
import { calculateStandortScore } from "@/lib/standortanalyse/scoring";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { standortanalyseFormSchema } from "@/lib/validations/standortanalyse";

const upsertStandortanalyseSchema = z
  .object({
    analysisId: z.string().uuid("Ungültige Analyse-ID").optional(),
    submit: z.boolean().default(false),
    createOrUpdateContact: z.boolean().default(false),
    formData: standortanalyseFormSchema,
  })
  .strict();

async function maybeCreateOrUpdateContact(args: {
  userId: string;
  analysisId: string;
  formData: z.infer<typeof standortanalyseFormSchema>;
}) {
  const supabase = await createServerSupabaseClient();
  const email = args.formData.kontakt.email.trim().toLowerCase();

  const { data: existingContact, error: existingError } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", args.userId)
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingContact == null) {
    const { error: insertError } = await supabase.from("contacts").insert({
      user_id: args.userId,
      vorname: args.formData.kontakt.vorname,
      nachname: args.formData.kontakt.name,
      email,
      telefon: args.formData.kontakt.telefon ?? null,
      notes: `Automatisch erstellt aus Standortanalyse ${args.analysisId}`,
      created_by: args.userId,
      updated_by: args.userId,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
    return;
  }

  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      vorname: args.formData.kontakt.vorname,
      nachname: args.formData.kontakt.name,
      telefon: args.formData.kontakt.telefon ?? null,
      updated_by: args.userId,
    })
    .eq("id", existingContact.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || user == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  let query = supabase
    .from("standortanalysen")
    .select("id,status,created_at,updated_at,total_points,recommendation,standort_ort,kontakt_name,submitted_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (statusFilter != null && statusFilter !== "") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    analyses: data ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || user == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = upsertStandortanalyseSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const score = calculateStandortScore(parsed.data.formData.kriterien);
  const nowIso = new Date().toISOString();
  let analysisId = parsed.data.analysisId;

  if (analysisId == null) {
    const insertPayload = toStandortanalyseInsert(user.id, parsed.data.formData, score);
    const { data: inserted, error: insertError } = await supabase
      .from("standortanalysen")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || inserted == null) {
      return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
    }
    analysisId = inserted.id;
  } else {
    const updatePayload = toStandortanalyseUpdate(parsed.data.formData, score);
    const { error: updateError } = await supabase
      .from("standortanalysen")
      .update(updatePayload)
      .eq("id", analysisId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (analysisId == null) {
    return NextResponse.json({ error: "Analyse-ID fehlt" }, { status: 500 });
  }

  const { error: deleteScoresError } = await supabase.from("standortanalyse_scores").delete().eq("analysis_id", analysisId);
  if (deleteScoresError) {
    return NextResponse.json({ error: deleteScoresError.message }, { status: 500 });
  }

  const scoreRows = toStandortanalyseScoresInsert(analysisId, score, parsed.data.formData);
  if (scoreRows.length > 0) {
    const { error: insertScoresError } = await supabase.from("standortanalyse_scores").insert(scoreRows);
    if (insertScoresError) {
      return NextResponse.json({ error: insertScoresError.message }, { status: 500 });
    }
  }

  if (parsed.data.submit) {
    const { error: submitError } = await supabase
      .from("standortanalysen")
      .update({ status: "submitted", submitted_at: nowIso })
      .eq("id", analysisId)
      .eq("user_id", user.id);

    if (submitError) {
      return NextResponse.json({ error: submitError.message }, { status: 500 });
    }

    if (parsed.data.createOrUpdateContact) {
      await maybeCreateOrUpdateContact({
        userId: user.id,
        analysisId,
        formData: parsed.data.formData,
      });
    }

    const externalEmail = parsed.data.formData.kontakt.email;
    if (externalEmail.trim().length > 0) {
      await sendNotificationHtmlEmail({
        actingAdminUserId: user.id,
        to: [externalEmail],
        subject: "AquaDock Standortanalyse eingegangen",
        html: `<p>Vielen Dank für Ihre Standortanalyse.</p><p>Referenz: <strong>${analysisId}</strong></p>`,
        text: `Vielen Dank für Ihre Standortanalyse. Referenz: ${analysisId}`,
      });
    }

    if (user.email != null && user.email.trim().length > 0) {
      await sendNotificationHtmlEmail({
        actingAdminUserId: user.id,
        to: [user.email],
        subject: "Neue Standortanalyse eingereicht",
        html: `<p>Eine Standortanalyse wurde eingereicht.</p><p>ID: <strong>${analysisId}</strong></p><p>Punkte: <strong>${score.totalPoints}</strong></p>`,
        text: `Neue Standortanalyse eingereicht. ID: ${analysisId}. Punkte: ${score.totalPoints}`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    analysisId,
    score: {
      totalPoints: score.totalPoints,
      recommendation: score.recommendation,
      unknownCount: score.unknownCount,
    },
    status: parsed.data.submit ? "submitted" : "draft",
  });
}
