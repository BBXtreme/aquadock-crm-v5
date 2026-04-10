// Server actions – profile avatar URL persistence (upload happens in browser)

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  changeEmailSchema,
  changePasswordSchema,
  profileAvatarSchema,
} from "@/lib/validations/profile";
import type { Database } from "@/types/database.types";

function formDataGetString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    return "";
  }
  return value;
}

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type UpdateProfileAvatarResult = {
  success: true;
  avatar_url: string | null;
};

export async function updateProfileAvatar(input: unknown): Promise<UpdateProfileAvatarResult> {
  const user = await requireUser();
  const parsed = profileAvatarSchema.parse(input);

  if (parsed.avatar_url !== null) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt");
    }
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const expectedPrefix = `${normalizedBase}/storage/v1/object/public/avatars/${user.id}/`;
    if (!parsed.avatar_url.startsWith(expectedPrefix)) {
      throw new Error("Ungültige Avatar-URL");
    }
  }

  const supabase = await createServerSupabaseClient();
  const updatePayload: Pick<ProfileUpdate, "avatar_url"> = {
    avatar_url: parsed.avatar_url,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id)
    .select("avatar_url")
    .single();

  if (error) {
    throw handleSupabaseError(error, "updateProfileAvatar");
  }

  revalidatePath("/profile");
  revalidatePath("/profile", "layout");

  return {
    success: true,
    avatar_url: data.avatar_url,
  };
}

export async function updatePasswordAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const email = user.email;
  if (email === null || email === "") {
    throw new Error(
      "Keine E-Mail-Adresse hinterlegt; Passwortänderung ist nicht möglich.",
    );
  }

  const raw = {
    current_password: formDataGetString(formData, "current_password"),
    new_password: formDataGetString(formData, "new_password"),
    confirm_password: formDataGetString(formData, "confirm_password"),
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (parsed.success === false) {
    const issue = parsed.error.issues[0];
    throw new Error(
      issue !== undefined ? issue.message : "Ungültige Eingabe.",
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.current_password,
  });

  if (verifyError) {
    throw handleSupabaseError(verifyError, "updatePasswordAction.verifyCurrent");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) {
    throw handleSupabaseError(error, "updatePasswordAction");
  }

  revalidatePath("/profile");
}

export async function updateEmailAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const raw = {
    new_email: formDataGetString(formData, "new_email"),
  };

  const parsed = changeEmailSchema.safeParse(raw);
  if (parsed.success === false) {
    const issue = parsed.error.issues[0];
    throw new Error(
      issue !== undefined ? issue.message : "Ungültige Eingabe.",
    );
  }

  const normalizedNew = parsed.data.new_email.toLowerCase();
  const current = user.email;
  if (
    current !== null &&
    current !== "" &&
    current.toLowerCase() === normalizedNew
  ) {
    throw new Error("Die neue Adresse entspricht der aktuellen.");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    email: parsed.data.new_email.trim(),
  });

  if (error) {
    throw handleSupabaseError(error, "updateEmailAction");
  }

  revalidatePath("/profile");
}
