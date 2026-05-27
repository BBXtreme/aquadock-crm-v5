import { z } from "zod";

export const PARTNER_APPLICATION_INDUSTRY_VALUES = [
  "tourism",
  "hospitality",
  "water_sports",
  "b2b_sales",
  "municipal",
  "other",
] as const;

export type PartnerApplicationIndustry = (typeof PARTNER_APPLICATION_INDUSTRY_VALUES)[number];

export const PARTNER_APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "interview",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

/** Non-terminal statuses that block a duplicate application within the cooldown window. */
export const PARTNER_APPLICATION_DUPLICATE_BLOCK_STATUSES = [
  "new",
  "reviewing",
  "interview",
] as const;

export const DACH_COUNTRY_CODES = ["DE", "AT", "CH"] as const;

export const CV_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const CV_MAX_BYTES = 5 * 1024 * 1024;

const industrySchema = z.enum(PARTNER_APPLICATION_INDUSTRY_VALUES);

export const partnerApplicationUploadUrlSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    contentType: z.enum(CV_ALLOWED_MIME_TYPES),
    fileSize: z.number().int().positive().max(CV_MAX_BYTES),
  })
  .strict();

export const partnerApplicationSubmitSchema = z
  .object({
    locale: z.enum(["de", "en"]),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(6).max(40),
    companyName: z.string().trim().max(200).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((v) => v.toUpperCase()),
    cityRegion: z.string().trim().min(2).max(200),
    proposedTerritory: z.string().trim().min(5).max(2000),
    yearsSalesExperience: z.number().int().min(0).max(60),
    industryExperience: z.array(industrySchema).min(1),
    motivation: z.string().trim().min(30).max(5000),
    cvUploadToken: z.string().trim().min(10).max(600).optional(),
    linkedinUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional(),
    referencesText: z.string().trim().max(2000).optional(),
    taxId: z.string().trim().max(50).optional(),
    handelsvertreterAck: z.boolean(),
    gdprConsent: z.literal(true),
    hp: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const isDach = DACH_COUNTRY_CODES.includes(
      data.countryCode as (typeof DACH_COUNTRY_CODES)[number],
    );
    if (isDach && !data.handelsvertreterAck) {
      ctx.addIssue({
        code: "custom",
        path: ["handelsvertreterAck"],
        message: "handelsvertreter_ack_required",
      });
    }
    const cvRequired = isDach || data.yearsSalesExperience >= 1;
    const cvToken = data.cvUploadToken?.trim() ?? "";
    if (cvRequired && cvToken.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cvUploadToken"],
        message: "cv_required",
      });
    }
  });

export type PartnerApplicationSubmitInput = z.infer<typeof partnerApplicationSubmitSchema>;

export function isDachCountry(countryCode: string): boolean {
  return DACH_COUNTRY_CODES.includes(
    countryCode.toUpperCase() as (typeof DACH_COUNTRY_CODES)[number],
  );
}

export function isPartnerApplicationCvRequired(input: {
  countryCode: string;
  yearsSalesExperience: number;
}): boolean {
  return isDachCountry(input.countryCode) || input.yearsSalesExperience >= 1;
}
