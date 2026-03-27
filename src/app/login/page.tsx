"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard";
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push("/dashboard");
      }
    };
    checkUser();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-semibold text-2xl">Sign In to AquaDock CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 flex justify-center space-x-2">
            <Button
              variant={view === "sign_in" ? "default" : "outline"}
              onClick={() => setView("sign_in")}
              className="flex-1"
            >
              Sign In
            </Button>
            <Button
              variant={view === "sign_up" ? "default" : "outline"}
              onClick={() => setView("sign_up")}
              className="flex-1"
            >
              Sign Up
            </Button>
          </div>
          <Auth
            supabaseClient={createClient()}
            view={view}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#24BACC",
                    brandAccent: "#1da0a8",
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={redirectTo}
            onlyThirdPartyProviders={false}
            magicLink={true}
            showLinks={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
