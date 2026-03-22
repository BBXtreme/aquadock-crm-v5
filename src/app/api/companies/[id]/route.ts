import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log("API companies/[id] - method:", request.method, "id:", id);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`API error [companies]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("API success:", { method: request.method, id: id });
  return NextResponse.json({ success: true, company: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log("API companies/[id] - method:", request.method, "id:", id);
  const body = await request.json();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("companies")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`API error [companies]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("API success:", { method: request.method, id: id });
  return NextResponse.json({ success: true, company: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
