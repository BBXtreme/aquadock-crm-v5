// Zod schemas for profile / avatar – aligned with Supabase profiles.avatar_url
// and the canonical multi-role table `public.user_roles`.

import { z } from "zod";

import { USER_ROLES } from "@/lib/auth/types";

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

/**
 * Passwort ändern im Profil: nur neues Passwort + Bestätigung.
 * Die aktive Session ersetzt die Eingabe des alten Passworts; Update nur via
 * `supabase.auth.updateUser({ password })` (wie Recovery auf `/login`).
 */
export const changePasswordSchema = z
  .object({
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

/** Admin: update another user's display name (Server Action from FormData). */
export const adminUpdateUserDisplayNameSchema = z
  .object({
    userId: z.string().uuid(),
    display_name: z
      .string()
      .trim()
      .min(1, "Anzeigename ist erforderlich.")
      .max(50, "Maximal 50 Zeichen."),
  })
  .strict();

export type AdminUpdateUserDisplayNameInput = z.infer<typeof adminUpdateUserDisplayNameSchema>;

/** Canonical role enum mirroring `public.user_roles.role`. */
export const userRoleSchema = z.enum(USER_ROLES);

/**
 * Multi-role list for admin write paths. Always at least one role; duplicates
 * collapsed; order normalized; admin must remain a subset of USER_ROLES.
 */
export const userRolesArraySchema = z
  .array(userRoleSchema)
  .min(1, "Mindestens eine Rolle ist erforderlich.")
  .transform((roles) => Array.from(new Set(roles)).sort());

/** FormData-friendly variant: accepts a JSON string OR repeated `roles` fields. */
export const userRolesFromFormDataSchema = z
  .preprocess((raw) => {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("[")) {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          return parsed;
        } catch {
          return [trimmed];
        }
      }
      return [trimmed];
    }
    return [];
  }, userRolesArraySchema);

/**
 * Legacy single-role change kept for backwards compatibility with callers that
 * have not migrated to the multi-role flow (e.g. older Server Actions).
 */
export const adminChangeUserRoleSchema = z
  .object({
    userId: z.string().uuid(),
    newRole: userRoleSchema,
  })
  .strict();

export type AdminChangeUserRoleInput = z.infer<typeof adminChangeUserRoleSchema>;

/** Multi-role write: replace the user's roles with this exact set. */
export const adminSetUserRolesSchema = z
  .object({
    userId: z.string().uuid(),
    roles: userRolesArraySchema,
  })
  .strict();

export type AdminSetUserRolesInput = z.infer<typeof adminSetUserRolesSchema>;

export const adminDeleteUserSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

/** Admin-created user (FormData: email, display_name, roles). */
export const adminCreateUserSchema = z
  .object({
    email: z.string().trim().min(1, "E-Mail ist erforderlich.").email("Ungültige E-Mail-Adresse."),
    display_name: z
      .string()
      .transform((s) => {
        const t = s.trim();
        return t === "" ? null : t;
      })
      .pipe(z.union([z.null(), z.string().min(1).max(200)])),
    roles: userRolesArraySchema,
  })
  .strict();

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

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
