import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // TODO: Add authentication when user login is implemented
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Add .eq("user_id", user.id) to all queries for RLS safety
  const { id } = await params;
  console.log("API companies/[id] - method:", request.method, "id:", id);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();

  if (error) {
    console.error(`API error [companies]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("API success:", { method: request.method, id: id });
  return NextResponse.json({ success: true, company: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // TODO: Add authentication when user login is implemented
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Add .eq("user_id", user.id) to all queries for RLS safety
  const { id } = await params;
  console.log("API companies/[id] - method:", request.method, "id:", id);
  const body = await request.json();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.from("companies").update(body).eq("id", id).select().single();

  if (error) {
    console.error(`API error [companies]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("API success:", { method: request.method, id: id });
  return NextResponse.json({ success: true, company: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // TODO: Add authentication when user login is implemented
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Add .eq("user_id", user.id) to all queries for RLS safety
  const { id } = await params;
  console.log("API companies/[id] - method:", request.method, "id:", id);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("companies").delete().eq("id", id);

  if (error) {
    console.error(`API error [companies]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("API success:", { method: request.method, id: id });
  return NextResponse.json({ success: true });
}
