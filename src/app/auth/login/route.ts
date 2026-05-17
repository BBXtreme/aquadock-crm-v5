// src/app/auth/login/route.ts
// Shared sign-in backend for AquaDock CRM.
//
// Both the internal `/login` page and the branded `/partner/login` page POST
// to this single endpoint so session creation, cookie handling, and role-based
// redirect logic live in exactly one place.
//
// Content-Type handling
//   - application/json                      → JSON body (used by partner form)
//   - multipart/form-data                   → FormData body
//   - application/x-www-form-urlencoded     → FormData body
//
// Response shape (JSON path)
//   200 { ok: true,  redirectTo: string }
//   400 { ok: false, code: "validation_error", message, fieldErrors }
//   401 { ok: false, code: "invalid_credentials", message }
//   500 { ok: false, code: "internal_error",     message }

import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCrmUserContext } from "@/lib/auth/get-crm-user-context";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type AuthLoginInput,
  authLoginSchema,
} from "@/lib/validations/auth-login";

type SuccessBody = {
  ok: true;
  redirectTo: string;
};

type ErrorBody = {
  ok: false;
  code:
    | "validation_error"
    | "invalid_credentials"
    | "internal_error"
    | "unsupported_content_type";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function jsonError(status: number, body: ErrorBody): NextResponse<ErrorBody> {
  return NextResponse.json<ErrorBody>(body, { status });
}

function jsonSuccess(body: SuccessBody): NextResponse<SuccessBody> {
  return NextResponse.json<SuccessBody>(body, { status: 200 });
}

function coerceBoolean(raw: FormDataEntryValue | null): boolean | undefined {
  if (raw === null) return undefined;
  if (raw === "true" || raw === "on" || raw === "1") return true;
  if (raw === "false" || raw === "off" || raw === "0") return false;
  return undefined;
}

function pickString(raw: FormDataEntryValue | null): string | undefined {
  if (raw === null) return undefined;
  if (typeof raw === "string") return raw;
  return undefined;
}

async function readLoginInput(request: NextRequest): Promise<AuthLoginInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const raw: unknown = await request.json();
    return authLoginSchema.parse(raw);
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await request.formData();
    const candidate: Record<string, unknown> = {
      email: pickString(form.get("email")) ?? "",
      password: pickString(form.get("password")) ?? "",
    };
    const remember = coerceBoolean(form.get("remember"));
    if (remember !== undefined) {
      candidate.remember = remember;
    }
    const redirectTo = pickString(form.get("redirectTo"));
    if (redirectTo !== undefined && redirectTo.length > 0) {
      candidate.redirectTo = redirectTo;
    }
    return authLoginSchema.parse(candidate);
  }

  throw new UnsupportedContentTypeError(contentType);
}

class UnsupportedContentTypeError extends Error {
  constructor(public readonly receivedContentType: string) {
    super(`Unsupported Content-Type: ${receivedContentType}`);
    this.name = "UnsupportedContentTypeError";
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SuccessBody | ErrorBody>> {
  let input: AuthLoginInput;
  try {
    input = await readLoginInput(request);
  } catch (error) {
    if (error instanceof UnsupportedContentTypeError) {
      return jsonError(415, {
        ok: false,
        code: "unsupported_content_type",
        message: `Unsupported Content-Type: ${error.receivedContentType}`,
      });
    }
    if (error instanceof ZodError) {
      return jsonError(400, {
        ok: false,
        code: "validation_error",
        message: "Eingaben sind ungültig.",
        fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
      });
    }
    return jsonError(400, {
      ok: false,
      code: "validation_error",
      message: "Eingaben konnten nicht verarbeitet werden.",
    });
  }

  const supabase = await createServerSupabaseClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError !== null) {
    return jsonError(401, {
      ok: false,
      code: "invalid_credentials",
      message: "E-Mail oder Passwort ist nicht korrekt.",
    });
  }

  const { user } = await getCrmUserContext();
  const roles = user?.roles ?? [];

  const redirectTo = resolvePostLoginRedirect({
    roles,
    redirectTo: input.redirectTo ?? null,
  });

  return jsonSuccess({ ok: true, redirectTo });
}
