import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("companies")
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error(`API error [companies]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("API success:", { method: request.method, id: "create" });
  return NextResponse.json({ success: true, company: data }, { status: 201 });
}
