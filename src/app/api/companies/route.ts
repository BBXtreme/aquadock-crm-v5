import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // DEVELOPMENT ONLY: Allow inserts with user_id: null for testing OSM POI import
    // TODO: Remove this when auth is fully implemented
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Ensure user_id is set for RLS (or null in development)
    body.user_id = user?.id || null;

    console.log("[API POST /companies] Received body:", body);

    const { data, error } = await supabase.from("companies").insert(body).select().single();

    if (error) {
      console.error("[API POST /companies] Supabase Error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 400 },
      );
    }

    if (!data?.id) {
      console.error("[API POST /companies] No ID returned from Supabase");
      return NextResponse.json(
        {
          success: false,
          error: "Keine ID von der Datenbank zurückgegeben",
        },
        { status: 500 },
      );
    }

    console.log("[API POST /companies] SUCCESS - New ID:", data.id);

    return NextResponse.json({
      success: true,
      id: data.id,
      data,
    });
  } catch (err: any) {
    console.error("[API POST /companies] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Interner Serverfehler",
      },
      { status: 500 },
    );
  }
}
