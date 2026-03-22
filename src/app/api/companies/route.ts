import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  console.log("API companies POST - body:", body);

  const { data, error } = await supabase
    .from("companies")
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error("Create company error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, company: data }, { status: 201 });
}
