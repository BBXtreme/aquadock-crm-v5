import { z } from "zod";

export const COMMENT_ENTITY_COMPANY = "company" as const;

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

export type CreateCompanyCommentInput = z.infer<typeof createCompanyCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
