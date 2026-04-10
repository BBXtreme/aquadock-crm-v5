// Zod schemas for profile / avatar – aligned with Supabase profiles.avatar_url

import { z } from "zod";

export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const allowedAvatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function mimeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  return null;
}

export function resolveProfileAvatarMime(file: File): string {
  if (file.type.length > 0 && allowedAvatarMimeTypes.has(file.type)) {
    return file.type;
  }
  const fromName = mimeFromFilename(file.name);
  return fromName ?? "image/jpeg";
}

export const profileAvatarSchema = z
  .object({
    avatar_url: z.union([z.string().url(), z.null()]),
  })
  .strict();

export type ProfileAvatarInput = z.infer<typeof profileAvatarSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .trim()
      .min(1, "Aktuelles Passwort ist erforderlich."),
    new_password: z
      .string()
      .trim()
      .min(8, "Neues Passwort muss mindestens 8 Zeichen haben."),
    confirm_password: z
      .string()
      .trim()
      .min(1, "Passwortbestätigung ist erforderlich."),
  })
  .strict()
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwörter stimmen nicht überein.",
    path: ["confirm_password"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/** Recovery link flow on `/login` — no current password; field is `password` for clarity. */
export const passwordRecoverySetSchema = z
  .object({
    password: z
      .string()
      .trim()
      .min(8, "Neues Passwort muss mindestens 8 Zeichen haben."),
    confirm_password: z
      .string()
      .trim()
      .min(1, "Passwortbestätigung ist erforderlich."),
  })
  .strict()
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwörter stimmen nicht überein.",
    path: ["confirm_password"],
  });

export type PasswordRecoverySetFormValues = z.infer<
  typeof passwordRecoverySetSchema
>;

export const changeEmailSchema = z
  .object({
    new_email: z
      .string()
      .trim()
      .min(1, "E-Mail-Adresse ist erforderlich.")
      .email("Ungültige E-Mail-Adresse."),
  })
  .strict();

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;

/** Display name on the profile “Update Profile” form (ProfileForm). */
export const profileDisplayNameSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, "Anzeigename ist erforderlich.")
      .max(50, "Maximal 50 Zeichen."),
  })
  .strict();

export type ProfileDisplayNameForm = z.infer<typeof profileDisplayNameSchema>;

const profileAvatarFileSchema = z
  .custom<File>((val): val is File => val instanceof File)
  .superRefine((file, ctx) => {
    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Datei darf maximal 2 MB groß sein",
      });
    }
    const mime = file.type.length > 0 ? file.type : mimeFromFilename(file.name);
    if (mime === null || !allowedAvatarMimeTypes.has(mime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nur Bilddateien erlaubt",
      });
    }
  });

/**
 * Validates avatar file size and type before client upload.
 */
export function parseProfileAvatarFile(file: File): void {
  profileAvatarFileSchema.parse(file);
}
