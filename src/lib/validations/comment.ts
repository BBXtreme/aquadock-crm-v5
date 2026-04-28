import { z } from "zod";

export const COMMENT_ENTITY_COMPANY = "company" as const;

/** Nullable string columns accept "" from clients; coerce to null. */
function emptyStringToNull(val: unknown): unknown {
  if (val === "") {
    return null;
  }
  return val;
}

export const createCompanyCommentSchema = z
  .object({
    companyId: z.string().uuid(),
    bodyMarkdown: z.string().trim().min(1, "Comment cannot be empty").max(8000, "Comment is too long"),
    parentId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    commentId: z.string().uuid(),
    bodyMarkdown: z.string().trim().min(1, "Comment cannot be empty").max(8000, "Comment is too long"),
  })
  .strict();

export const deleteCommentSchema = z
  .object({
    commentId: z.string().uuid(),
  })
  .strict();

export const restoreOwnCommentSchema = z
  .object({
    commentId: z.string().uuid(),
  })
  .strict();

export const registerCommentAttachmentSchema = z
  .object({
    companyId: z.string().uuid("Ungültige Firmen-ID"),
    commentId: z.string().uuid("Ungültige Kommentar-ID"),
    storageObjectPath: z
      .string()
      .trim()
      .min(1, "Speicherpfad fehlt")
      .max(1024, "Speicherpfad zu lang"),
    fileName: z.string().trim().min(1, "Dateiname fehlt").max(512, "Dateiname zu lang"),
    contentType: z.preprocess(emptyStringToNull, z.string().trim().max(128).nullable().optional()),
    byteSize: z.union([z.number().int().positive(), z.null()]).optional(),
  })
  .strict();

export const getCommentAttachmentSignedUrlSchema = z
  .object({
    attachmentId: z.string().uuid("Ungültige Anhang-ID"),
  })
  .strict();

export const deleteCommentAttachmentSchema = z
  .object({
    attachmentId: z.string().uuid("Ungültige Anhang-ID"),
  })
  .strict();

export type CreateCompanyCommentInput = z.infer<typeof createCompanyCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type RestoreOwnCommentInput = z.infer<typeof restoreOwnCommentSchema>;
export type RegisterCommentAttachmentInput = z.infer<typeof registerCommentAttachmentSchema>;
export type GetCommentAttachmentSignedUrlInput = z.infer<typeof getCommentAttachmentSignedUrlSchema>;
export type DeleteCommentAttachmentInput = z.infer<typeof deleteCommentAttachmentSchema>;
