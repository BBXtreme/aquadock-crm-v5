// Server actions – profile avatar URL persistence (upload happens in browser)

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { profileAvatarSchema } from "@/lib/validations/profile";
import type { Database } from "@/types/database.types";

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
