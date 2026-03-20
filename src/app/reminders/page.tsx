"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, AlertTriangle, Calendar, Star, RefreshCw } from "lucide-react";
import { isAfter, isThisWeek, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

export default function RemindersPage() {
  const [allReminders, setAllReminders] = useState<Record<string, unknown>[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*, companies(firmenname)")
        .order("due_date", { ascending: true });

      if (error) throw error;

      setAllReminders(data || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch reminders",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const reminders = allReminders.filter((r) => r.status === "open");

  const openReminders = allReminders.filter((r) => r.status === "open").length;
  const overdue = allReminders.filter(
    (r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date)),
  ).length;
  const thisWeek = allReminders.filter(
    (r) => r.status === "open" && isThisWeek(new Date(r.due_date)),
  ).length;
  const highPriority = allReminders.filter(
    (r) => r.status === "open" && r.priority === "high",
  ).length;

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Home {">"} Reminders
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Reminders
              </h1>
            </div>
            <Button>New Reminder</Button>
          </div>
          <Alert variant="destructive" className="border-red-500">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={fetchData}
                variant="outline"
                className="border-[#24BACC] text-[#24BACC] hover:bg-[#24BACC] hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Home {">"} Reminders
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Reminders</h1>
          </div>
          <Button>New Reminder</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Open Reminders
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{openReminders}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overdue Today
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{overdue}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{thisWeek}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Priority
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{highPriority}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline">All</Button>
          <Button variant="outline">Open</Button>
          <Button variant="outline">Overdue</Button>
          <Button variant="outline">My Tasks</Button>
        </div>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
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
                      const isOverdue = isAfter(
                        new Date(),
                        new Date(reminder.due_date),
                      );
                      return (
                        <TableRow key={reminder.id}>
                          <TableCell>{reminder.title}</TableCell>
                          <TableCell>
                            <Link
                              href={`/companies/${reminder.company_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {reminder.companies?.firmenname}
                            </Link>
                          </TableCell>
                          <TableCell
                            className={isOverdue ? "text-rose-500" : ""}
                          >
                            {formatDistanceToNow(new Date(reminder.due_date), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                reminder.priority === "high"
                                  ? "bg-rose-600 text-white"
                                  : "bg-amber-600 text-white"
                              }
                            >
                              {reminder.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                reminder.status === "open"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-500 text-white"
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
