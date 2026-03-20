"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { Company } from "@/lib/supabase/types";

interface SupabaseDebugProps {
  status: string;
  rowCount: number;
  sampleData: Company[];
  error: string | null;
  user: { id: string; email: string } | null;
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
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              Supabase Connection Debug
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96">
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
