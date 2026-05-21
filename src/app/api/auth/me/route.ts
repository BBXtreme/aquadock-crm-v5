import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
  });
}
