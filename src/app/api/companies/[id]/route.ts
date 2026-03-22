import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, company: data });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();
  const { data, error } = await supabase
    .from("companies")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, company: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
