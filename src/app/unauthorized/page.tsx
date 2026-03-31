// src/app/unauthorized/page.tsx
// This page is displayed when a user tries to access a protected route without proper authorization.

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-destructive mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          You do not have permission to access this page.<br />
          Please contact an administrator if you believe this is an error.
        </p>
        <Button asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}