// src/app/api/contacts/[id]/route.ts
// This file defines the API route handlers for the /api/contacts/[id] endpoint, which allows fetching, updating, and deleting a specific contact by ID.
// The GET handler retrieves the contact details along with the linked company information from the database using Supabase.
// The PUT handler updates the contact information based on the request body and returns the updated contact data.
// The DELETE handler removes the contact from the database. All handlers include error handling to return appropriate responses in case of issues.

import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // TODO: Add authentication when user login is implemented
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Add .eq("user_id", user.id) to all queries for RLS safety
  const supabase = await createServerSupabaseClient();
  const { id } = await params;
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies!company_id(firmenname)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // TODO: Add authentication when user login is implemented
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Add .eq("user_id", user.id) to all queries for RLS safety
  const supabase = await createServerSupabaseClient();
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase.from("contacts").update(body).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // TODO: Add authentication when user login is implemented
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Add .eq("user_id", user.id) to all queries for RLS safety
  const supabase = await createServerSupabaseClient();
  const { id } = await params;
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
