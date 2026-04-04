// src/app/api/reminders/route.ts
// This file defines the API route handlers for the /api/reminders endpoint, which allows fetching all reminders and creating new reminders.
// The GET handler retrieves all reminders from the database using the Supabase client and returns them as a JSON response.
// The POST handler accepts a new reminder in the request body, creates it in the database using the Supabase client, and returns the created reminder as a JSON response.
// Both handlers include error handling to log any issues and return appropriate error responses if something goes wrong during database operations.

import { type NextRequest, NextResponse } from "next/server";
import { createReminder, getReminders } from "@/lib/actions/reminders";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const reminders = await getReminders(supabase);
    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    const reminder = await createReminder(body, supabase);
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
