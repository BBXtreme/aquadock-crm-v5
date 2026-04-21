import { z } from "zod";

const emptyToNull = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? null : v.trim();

export const accessRequestSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().trim().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().trim().min(1, "Confirm password is required."),
    display_name: z.string().optional(),
  })
  .strict()
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  })
  .transform((d) => ({
    email: d.email.toLowerCase(),
    password: d.password,
    display_name: emptyToNull(d.display_name),
  }));

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
