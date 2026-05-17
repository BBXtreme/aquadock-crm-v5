// src/lib/validations/auth-login.ts
// Strict Zod schemas for the shared /auth/login endpoint and partner client form.

import { z } from "zod";

/** Server-side payload accepted by /auth/login (both FormData and JSON). */
export const authLoginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "E-Mail ist erforderlich.")
      .email("Ungültige E-Mail-Adresse."),
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen haben."),
    remember: z.boolean().optional(),
    /** Optional safe-redirect override (must be a relative path starting with `/`). */
    redirectTo: z
      .string()
      .trim()
      .min(1)
      .startsWith("/", "redirectTo muss ein relativer Pfad sein.")
      .optional(),
  })
  .strict();

export type AuthLoginInput = z.infer<typeof authLoginSchema>;

/** Client-side partner login form schema (German messages). */
export const partnerLoginFormSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Bitte gib Deine E-Mail-Adresse ein.")
      .email("Bitte eine gültige E-Mail-Adresse eingeben."),
    password: z
      .string()
      .min(8, "Mindestens 8 Zeichen."),
    remember: z.boolean(),
  })
  .strict();

export type PartnerLoginFormValues = z.infer<typeof partnerLoginFormSchema>;
