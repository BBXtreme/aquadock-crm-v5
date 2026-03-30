// src/app/api/auth/user/route.ts
// This file defines the API route handler for fetching the authenticated user's information.
// The GET handler uses the Supabase client to retrieve the current user based on the authentication token.
// If the user is authenticated, it returns the user's ID in a JSON response. If not, it returns an unauthorized error.
// The handler also includes error handling to catch and log any unexpected issues, returning a generic internal server error response if something goes wrong.

import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";

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
  } catch (err: unknown) {
    console.error("[API GET /auth/user] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
