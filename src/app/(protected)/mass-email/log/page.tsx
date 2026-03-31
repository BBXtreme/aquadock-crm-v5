// src/app/(protected)/mass-email/log/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser-client";
import type { EmailLog } from "@/lib/supabase/database.types";

export default function EmailLogPage() {
  const [filter, setFilter] = useState<"all" | "sent" | "error">("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const client = createClient();
      const { data, error } = await client.from("email_log").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.status !== filter) return false;
    if (search && !log.recipient_email.toLowerCase().includes(search.toLowerCase()) && !log.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">E-Mail Versandlog</h1>
          <p className="text-muted-foreground">Übersicht über alle gesendeten E-Mails</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={filter} onValueChange={(value: "all" | "sent" | "error") => setFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="sent">Erfolgreich</SelectItem>
            <SelectItem value="error">Fehlgeschlagen</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Suche nach Empfänger oder Betreff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Empfänger</TableHead>
              <TableHead>Betreff</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Lade...</TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Keine Einträge gefunden</TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString('de-DE')}</TableCell>
                  <TableCell>{log.recipient_email}</TableCell>
                  <TableCell>{log.subject}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                      {log.status === "sent" ? "Gesendet" : "Fehler"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
