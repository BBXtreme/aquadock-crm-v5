import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSystemSmtpConfigForNotifications,
  sendNotificationHtmlEmail,
} from "@/lib/services/smtp-delivery";
import { createInviteDraftPayload } from "@/lib/standortanalyse/persistence";
import { generateShareToken, hashSharePassword, hashShareToken } from "@/lib/standortanalyse/share";
import {
  buildStandortanalyseInviteEmailContent,
  isPlaceholderInviteEmail,
} from "@/lib/standortanalyse/share-invite-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createShareSchema = z
  .object({
    analysisId: z.string().uuid("Ungültige Analyse-ID").optional(),
    password: z.string().trim().min(8, "Passwort muss mindestens 8 Zeichen lang sein").optional(),
    expiresInHours: z.number().int().min(1).max(168).default(24),
    maxUses: z.number().int().min(1).max(25).default(1),
    revokeOlderLinks: z.boolean().default(false),
    sendInviteEmail: z.boolean().default(false),
    recipientEmail: z
      .string()
      .trim()
      .email("Ungültige E-Mail-Adresse")
      .max(320, "E-Mail darf maximal 320 Zeichen lang sein")
      .optional(),
    recipientName: z.string().trim().max(240, "Name darf maximal 240 Zeichen lang sein").optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.sendInviteEmail) {
      return;
    }
    if (value.recipientEmail == null || value.recipientEmail.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Empfänger-E-Mail ist erforderlich, wenn die Einladung per E-Mail versendet werden soll",
        path: ["recipientEmail"],
      });
      return;
    }
    if (isPlaceholderInviteEmail(value.recipientEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bitte eine gültige Kunden-E-Mail-Adresse angeben",
        path: ["recipientEmail"],
      });
    }
  });

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
  const analysisId = url.searchParams.get("analysisId");
  if (analysisId == null || analysisId.trim() === "") {
    return NextResponse.json({ lastShareLink: null });
  }

  const admin = createAdminClient();
  const { data: analysis, error: analysisError } = await admin
    .from("standortanalysen")
    .select("id,user_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (analysisError || analysis == null) {
    return NextResponse.json({ error: analysisError?.message ?? "Analyse nicht gefunden" }, { status: 404 });
  }
  if (analysis.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: link, error: linkError } = await admin
    .from("standortanalyse_share_links")
    .select("analysis_id, created_at, expires_at, max_uses, used_count, is_active, password_hash")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({
    lastShareLink:
      link == null
        ? null
        : {
            analysisId: link.analysis_id,
            createdAt: link.created_at,
            expiresAt: link.expires_at,
            maxUses: link.max_uses,
            usedCount: link.used_count,
            isActive: link.is_active,
            passwordProtected: link.password_hash != null,
          },
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

  const parsed = createShareSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const token = generateShareToken();
  const tokenHash = hashShareToken(token);
  const passwordHash = parsed.data.password ? hashSharePassword(parsed.data.password) : null;
  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000).toISOString();
  const shareUrl = new URL(`/standortanalyse/share/${token}`, request.url).toString();

  const admin = createAdminClient();
  let analysisId = parsed.data.analysisId;

  if (analysisId == null) {
    const draftPayload = createInviteDraftPayload(user.id);
    const { data: draftInsert, error: draftError } = await admin
      .from("standortanalysen")
      .insert(draftPayload.analysisInsert)
      .select("id")
      .single();

    if (draftError || draftInsert == null) {
      return NextResponse.json({ error: draftError?.message ?? "Draft konnte nicht erstellt werden" }, { status: 500 });
    }
    const draftAnalysisId = draftInsert.id;
    if (draftAnalysisId == null) {
      return NextResponse.json({ error: "Draft-ID fehlt" }, { status: 500 });
    }
    analysisId = draftAnalysisId;

    const scoreRows = draftPayload.scoreRowsWithoutAnalysisId.map((row) => ({
      analysis_id: draftAnalysisId,
      ...row,
    }));
    if (scoreRows.length > 0) {
      const { error: scoreError } = await admin.from("standortanalyse_scores").insert(scoreRows);
      if (scoreError) {
        return NextResponse.json({ error: scoreError.message }, { status: 500 });
      }
    }
  }

  const { data: analysis, error: analysisError } = await admin
    .from("standortanalysen")
    .select("id, user_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (analysisError || analysis == null) {
    return NextResponse.json({ error: analysisError?.message ?? "Analyse nicht gefunden" }, { status: 404 });
  }
  if (analysis.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.revokeOlderLinks) {
    const { error: revokeError } = await admin
      .from("standortanalyse_share_links")
      .update({ is_active: false })
      .eq("analysis_id", analysisId)
      .eq("is_active", true);
    if (revokeError) {
      return NextResponse.json({ error: revokeError.message }, { status: 500 });
    }
  }

  const { error: insertError } = await admin.from("standortanalyse_share_links").insert({
    analysis_id: analysisId,
    token_hash: tokenHash,
    password_hash: passwordHash,
    expires_at: expiresAt,
    max_uses: parsed.data.maxUses,
    used_count: 0,
    is_active: true,
    created_by: user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  let emailSent = false;
  let emailError: string | null = null;

  if (parsed.data.sendInviteEmail && parsed.data.recipientEmail != null) {
    const recipientEmail = parsed.data.recipientEmail.trim();
    const mailContent = buildStandortanalyseInviteEmailContent({
      shareUrl,
      expiresAt,
      passwordProtected: passwordHash !== null,
      recipientName: parsed.data.recipientName ?? null,
    });

    const smtp = await getSystemSmtpConfigForNotifications(user.id);
    if (smtp === null) {
      emailError = "SMTP ist nicht konfiguriert (Einstellungen → SMTP).";
    } else {
      try {
        await sendNotificationHtmlEmail({
          actingAdminUserId: user.id,
          to: [recipientEmail],
          subject: mailContent.subject,
          html: mailContent.html,
          text: mailContent.text,
        });
        emailSent = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden";
        console.error("[standortanalyse/share] invite email failed:", error);
        emailError = message;
      }
    }
  }

  return NextResponse.json({
    analysisId,
    shareUrl,
    expiresAt,
    maxUses: parsed.data.maxUses,
    passwordProtected: passwordHash !== null,
    emailSent,
    emailError,
  });
}
