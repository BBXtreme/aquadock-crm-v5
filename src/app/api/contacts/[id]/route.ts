import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies!company_id(firmenname)")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: data });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();
  const { data, error } = await supabase
    .from("contacts")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
