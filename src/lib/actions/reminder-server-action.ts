"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createInAppNotification } from "@/lib/services/in-app-notifications";
import { createReminder } from "@/lib/services/reminders";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Reminder, ReminderInsert } from "@/types/database.types";

const createReminderActionInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    company_id: z.string().uuid(),
    due_date: z
      .string()
      .min(1)
      .refine((val) => {
        const date = new Date(val);
        return date > new Date();
      }, "Due date must be in the future"),
    priority: z.string().optional(),
    status: z.string().optional(),
    assigned_to: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.string().uuid().nullish(),
    ),
    description: z.string().optional(),
  })
  .strict();

function mapToReminderInsert(
  parsed: z.infer<typeof createReminderActionInputSchema>,
  userId: string,
): ReminderInsert {
  return {
    title: parsed.title,
    company_id: parsed.company_id,
    due_date: new Date(parsed.due_date).toISOString(),
    description:
      parsed.description !== undefined && parsed.description.trim() !== "" ? parsed.description.trim() : null,
    priority: parsed.priority ?? "normal",
    status: parsed.status ?? "open",
    assigned_to: parsed.assigned_to ?? null,
    user_id: userId,
    created_by: userId,
    updated_by: userId,
  };
}

/**
 * Create a reminder for the current user; notifies assignee when `assigned_to` is another user.
 */
export async function createReminderAction(input: unknown): Promise<Reminder> {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("Unauthorized");
  }
  const parsed = createReminderActionInputSchema.parse(input);
  const supabase = await createServerSupabaseClient();
  const insert = mapToReminderInsert(parsed, user.id);
  const reminder = await createReminder(insert, supabase);

  const assignee = reminder.assigned_to;
  if (assignee == null || assignee.trim() === "" || assignee === user.id) {
    return reminder;
  }

  try {
    await createInAppNotification({
      type: "reminder_assigned",
      userId: assignee,
      title: "Neue Aufgabe zugewiesen",
      body: reminder.title,
      payload: {
        companyId: reminder.company_id,
        reminderId: reminder.id,
      },
      actorUserId: user.id,
      dedupeKey: `reminder_assigned:${reminder.id}:${assignee}`,
    });
  } catch (err) {
    console.error("[createReminderAction] in-app notification failed", err);
  }

  return reminder;
}
