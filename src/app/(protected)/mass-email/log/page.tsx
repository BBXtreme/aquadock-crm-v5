// src/app/(protected)/mass-email/log/page.tsx
// This file defines the EmailLogPage component, which displays a log of all sent emails in the application. It allows users to filter by status (sent or error) and search by recipient email or subject.

"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/ui/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser-client";
import type { EmailLog } from "@/lib/supabase/database.types";

export default function EmailLogPage() {
  const [filter, setFilter] = useState<"all" | "sent" | "error">("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-logs"],
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
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <PageHeader
        title="E-Mail Versandlog"
        description="Übersicht über alle gesendeten E-Mails"
        icon={<Mail className="h-5 w-5" />}
      />

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
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="text-muted-foreground">Keine E-Mail-Logs gefunden.</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.created_at ? new Date(log.created_at).toLocaleString('de-DE') : 'Unbekannt'}</TableCell>
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
