// src/app/(protected)/mass-email/log/ClientEmailLogPage.tsx
// This file defines the ClientEmailLogPage component, which displays a log of all sent emails in the application. It allows users to filter by status (sent or error) and search by recipient email or subject.

"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyDash } from "@/components/ui/empty-dash";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormat, useT } from "@/lib/i18n/use-translations";
import type { EmailLog } from "@/types/database.types";

type ClientEmailLogPageProps = {
  logs: EmailLog[];
};

export default function ClientEmailLogPage({ logs }: ClientEmailLogPageProps) {
  const router = useRouter();
  const t = useT("massEmail");
  const format = useFormat();
  const safeLogs = logs ?? [];
  const [filter, setFilter] = useState<"all" | "sent" | "error">("all");
  const [search, setSearch] = useState("");

  const filteredLogs = safeLogs.filter((log) => {
    if (filter !== "all" && log.status !== filter) return false;
    if (
      search &&
      !log.recipient_email.toLowerCase().includes(search.toLowerCase()) &&
      !(log.subject ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const formatLogDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t("logTitle")}
            </h1>
          </div>
          <p className="text-muted-foreground">{t("logSubtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("logBack")}
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={filter} onValueChange={(value: "all" | "sent" | "error") => setFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("logFilterAll")}</SelectItem>
            <SelectItem value="sent">{t("logFilterSent")}</SelectItem>
            <SelectItem value="error">{t("logFilterError")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={t("logSearchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{t("logColMode")}</TableHead>
              <TableHead className="min-w-48">{t("logColRecipient")}</TableHead>
              <TableHead className="min-w-32">{t("logColSubject")}</TableHead>
              <TableHead className="w-32">{t("logColTemplate")}</TableHead>
              <TableHead className="w-32">{t("logColDate")}</TableHead>
              <TableHead className="w-24">{t("logColStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">{t("logEmpty")}</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {log.mode === "test" ? t("logModeTest") : t("logModeMass")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.recipient_name ? `${log.recipient_name} <${log.recipient_email}>` : log.recipient_email}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">
                      {log.subject == null ? (
                        <EmptyDash />
                      ) : log.subject.length > 50 ? (
                        `${log.subject.slice(0, 50)}...`
                      ) : (
                        log.subject
                      )}
                    </div>
                    {log.status === "error" && log.error_msg ? (
                      <div className="text-xs text-destructive mt-1 truncate">{log.error_msg}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {log.template_name ? (
                      <Link href="/mass-email/templates">
                        <Badge variant="secondary" className="cursor-pointer">
                          {log.template_name}
                        </Badge>
                      </Link>
                    ) : (
                      <EmptyDash />
                    )}
                  </TableCell>
                  <TableCell>
                    {formatLogDate(log.sent_at) ??
                      formatLogDate(log.created_at) ??
                      t("logDateUnknown")}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                            {log.status === "sent" ? t("logStatusSent") : t("logStatusError")}
                          </Badge>
                        </TooltipTrigger>
                        {log.status === "error" && log.error_msg ? (
                          <TooltipContent>
                            <p>{log.error_msg}</p>
                          </TooltipContent>
                        ) : null}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  );
}
