"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser-client";
import type { EmailLog } from "@/lib/supabase/database.types";

export default function EmailLogTable() {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-logs", sortOrder],
    queryFn: async () => {
      const client = createClient();
      const { data, error } = await client.from("email_log").select("*").order("created_at", { ascending: sortOrder === "asc" });
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={toggleSort} className="cursor-pointer">
              Sent At {sortOrder === "asc" ? "↑" : "↓"}
            </TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">Loading...</TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">No logs found</TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.created_at ? new Date(log.created_at).toLocaleString('de-DE') : 'Unknown'}</TableCell>
                <TableCell>{log.recipient_email}</TableCell>
                <TableCell>{log.subject}</TableCell>
                <TableCell>
                  <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                    {log.status === "sent" ? "Sent" : "Error"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
