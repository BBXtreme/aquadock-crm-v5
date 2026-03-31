// src/components/email/RecipientSelector.tsx
// Client Component for selecting email recipients based on the mode (contacts or companies), with search functionality and select all option.

"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Recipient = {
  id: string;
  name: string;
  email: string;
  firmenname?: string;
  company_id?: string;
};

type RecipientSelectorProps = {
  mode: "contacts" | "companies";
  setMode: (mode: "contacts" | "companies") => void;
  search: string;
  setSearch: (search: string) => void;
  selectedRecipientIds: string[];
  setSelectedRecipientIds: React.Dispatch<React.SetStateAction<string[]>>;
  recipients: Recipient[];
  isLoading: boolean;
  handleSelectAll: () => void;
};

export default function RecipientSelector({
  mode,
  setMode,
  search,
  setSearch,
  selectedRecipientIds,
  setSelectedRecipientIds,
  recipients,
  isLoading,
  handleSelectAll,
}: RecipientSelectorProps) {
  const handleClearSelection = () => {
    setSelectedRecipientIds([]);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <CardTitle>Empfänger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex gap-3">
          <Button
            variant={mode === "contacts" ? "default" : "outline"}
            onClick={() => setMode("contacts")}
            className="flex-1"
          >
            Kontakte
          </Button>
          <Button
            variant={mode === "companies" ? "default" : "outline"}
            onClick={() => setMode("companies")}
            className="flex-1"
          >
            Firmen
          </Button>
        </div>

        <Input
          placeholder="Name, E-Mail oder Firma suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSelectAll} size="sm">
              {selectedRecipientIds.length === recipients.length ? "Auswahl aufheben" : "Alle auswählen"}
            </Button>
            {selectedRecipientIds.length > 0 && (
              <Button variant="outline" onClick={handleClearSelection} size="sm">
                Auswahl löschen
              </Button>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{recipients.length} gefunden</span>
        </div>

        <ScrollArea className="h-96 border rounded-xl">
          {isLoading ? (
            <div className="p-8 text-center">Lade Empfänger...</div>
          ) : recipients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Keine Empfänger gefunden</p>
              <p className="text-sm text-muted-foreground">Versuchen Sie eine andere Suche oder wechseln Sie den Modus.</p>
            </div>
          ) : (
            recipients.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-accent cursor-pointer border-b last:border-0"
              >
                <Checkbox
                  checked={selectedRecipientIds.includes(rec.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedRecipientIds((prev: string[]) => [...prev, rec.id]);
                    else setSelectedRecipientIds((prev: string[]) => prev.filter((id: string) => id !== rec.id));
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{rec.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{rec.email}</div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
