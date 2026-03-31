// src/app/(protected)/mass-email/log/ClientEmailLogPage.tsx
// This file defines the ClientEmailLogPage component, which displays a log of all sent emails in the application. It allows users to filter by status (sent or error) and search by recipient email or subject.

"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { EmailLog } from "@/lib/supabase/database.types";

type ClientEmailLogPageProps = {
  logs: EmailLog[];
};

export default function ClientEmailLogPage({ logs }: ClientEmailLogPageProps) {
  const router = useRouter();
  const safeLogs = logs ?? [];
  const [filter, setFilter] = useState<"all" | "sent" | "error">("all");
  const [search, setSearch] = useState("");

  const filteredLogs = safeLogs.filter((log) => {
    if (filter !== "all" && log.status !== filter) return false;
    if (search && !log.recipient_email.toLowerCase().includes(search.toLowerCase()) && !log.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <h1 className="text-3xl font-bold">E-Mail Versandlog</h1>
          </div>
          <p className="text-muted-foreground">Übersicht über alle gesendeten E-Mails</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
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
              <TableHead className="w-20">Modus</TableHead>
              <TableHead className="min-w-48">Empfänger</TableHead>
              <TableHead className="min-w-32">Betreff</TableHead>
              <TableHead className="w-32">Vorlage</TableHead>
              <TableHead className="w-32">Datum</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">Keine E-Mail-Logs gefunden.</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {log.mode === "test" ? "Test" : "Massenversand"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.recipient_name ? `${log.recipient_name} <${log.recipient_email}>` : log.recipient_email}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">{log.subject.length > 50 ? `${log.subject.substring(0, 50)}...` : log.subject}</div>
                    {log.status === "error" && log.error_msg && (
                      <div className="text-xs text-red-500 mt-1 truncate">{log.error_msg}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.template_name ? (
                      <Link href="/mass-email/templates">
                        <Badge variant="secondary" className="cursor-pointer">
                          {log.template_name}
                        </Badge>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.sent_at ? new Date(log.sent_at).toLocaleString('de-DE') : log.created_at ? new Date(log.created_at).toLocaleString('de-DE') : 'Unbekannt'}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                            {log.status === "sent" ? "Gesendet" : "Fehler"}
                          </Badge>
                        </TooltipTrigger>
                        {log.status === "error" && log.error_msg && (
                          <TooltipContent>
                            <p>{log.error_msg}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
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
