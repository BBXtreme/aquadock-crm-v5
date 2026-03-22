import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();
  const { data, error } = await supabase.from("companies").insert(body).select().single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
