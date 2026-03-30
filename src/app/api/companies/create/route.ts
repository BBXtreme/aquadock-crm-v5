// src/app/api/companies/route.ts
// This file defines the API route handler for the /api/companies endpoint, which allows creating new company records in the database.
// The POST handler retrieves the authenticated user, validates the incoming request body, and inserts a new company record into the database using Supabase.
// The handler includes error handling to return appropriate responses in case of authentication issues, validation errors, or database errors.
// The response includes the success status, the ID of the newly created company, and the company data if the insertion is successful.

import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();
  const { data, error } = await supabase.from("companies").insert(body).select().single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
