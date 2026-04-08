"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { performBrowserSignOutToLogin } from "@/lib/auth/browser-sign-out";

export function ProfileSignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="destructive"
      className="flex h-11 items-center px-6"
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void (async () => {
          const ok = await performBrowserSignOutToLogin();
          if (!ok) {
            setPending(false);
          }
        })();
      }}
    >
      <LogOut className="mr-2 h-5 w-5" />
      Sign Out
    </Button>
  );
}
