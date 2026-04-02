"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface SupabaseDebugProps {
  status: string;
  rowCount: number;
  sampleData: Company[];
  error: string | null;
  user: { id: string; email: string | undefined } | null;
  statusSummary: { lead: number; won: number };
}

export default function SupabaseDebug({
  status,
  rowCount,
  sampleData,
  error,
  user,
  statusSummary,
}: SupabaseDebugProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              Supabase Connection Debug
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(
                {
                  status,
                  rowCount,
                  sampleData,
                  error,
                  user,
                  statusSummary,
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
