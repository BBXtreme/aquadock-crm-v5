import { z } from "zod";
import { companySchema } from "@/lib/validations/company";

export const updateCompanyWithOwnerInputSchema = z
  .object({
    id: z.string().uuid(),
    company: companySchema,
    user_id: z.string().uuid().nullable(),
    sync_contact_owners: z.boolean(),
  })
  .strict();

export type UpdateCompanyWithOwnerInput = z.infer<typeof updateCompanyWithOwnerInputSchema>;
