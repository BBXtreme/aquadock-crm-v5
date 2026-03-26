import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ userId: user.id });
  } catch (err: any) {
    console.error("[API GET /auth/user] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
