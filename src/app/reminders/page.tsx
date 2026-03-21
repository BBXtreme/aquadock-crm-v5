"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { formatDistanceToNow, isAfter, isThisWeek } from "date-fns";
import { AlertTriangle, Bell, Calendar, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { getReminders } from "@/lib/supabase/services/reminders";
import type { Reminder } from "@/lib/supabase/types";

export default function RemindersPage() {
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const reminders = await getReminders(supabase);
      setAllReminders(reminders);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erinnerungen konnten nicht geladen werden";
      setError(message);
      toast.error("Fehler beim Laden", {
        description: message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reminders = allReminders.filter((r) => r.status === "open");

  const openReminders = allReminders.filter((r) => r.status === "open").length;
  const overdue = allReminders.filter((r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date))).length;
  const thisWeek = allReminders.filter((r) => r.status === "open" && isThisWeek(new Date(r.due_date))).length;
  const highPriority = allReminders.filter((r) => r.status === "open" && r.priority === "high").length;

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Home → Reminders</p>
              <h1 className="font-semibold text-3xl tracking-tight">Reminders</h1>
            </div>
            <Button>New Reminder</Button>
          </div>
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Reminders</p>
            <h1 className="font-semibold text-3xl tracking-tight">Reminders</h1>
          </div>
          <Button>New Reminder</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Open Reminders</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{openReminders}</div>}
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Overdue Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{overdue}</div>}
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{thisWeek}</div>}
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">High Priority</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{highPriority}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline">All</Button>
          <Button variant="outline">Open</Button>
          <Button variant="outline">Overdue</Button>
          <Button variant="outline">My Tasks</Button>
        </div>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map(() => (
                    <Skeleton className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.map((reminder) => {
                      const isOverdue = isAfter(new Date(), new Date(reminder.due_date));
                      return (
                        <TableRow key={reminder.id}>
                          <TableCell>{reminder.title}</TableCell>
                          <TableCell>
                            <Link href={`/companies/${reminder.company_id}`} className="text-blue-600 hover:underline">
                              {reminder.companies?.firmenname}
                            </Link>
                          </TableCell>
                          <TableCell className={isOverdue ? "text-rose-500" : ""}>
                            {formatDistanceToNow(new Date(reminder.due_date), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                reminder.priority === "high" ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                              }
                            >
                              {reminder.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                reminder.status === "open" ? "bg-emerald-600 text-white" : "bg-zinc-500 text-white"
                              }
                            >
                              {reminder.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{reminder.assigned_to}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!reminders.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
