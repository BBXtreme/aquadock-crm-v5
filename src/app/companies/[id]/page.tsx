"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { Anchor, Bell, Calendar, Mail, MapPin, Phone } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { getCompanyById } from "@/lib/supabase/services/companies";
import type { Company } from "@/lib/supabase/types";

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      setError("");
      try {
        const supabase = createClient();
        const company = await getCompanyById(id, supabase);
        setCompany(company);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch company");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchCompany();
    }
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div>Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !company) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div>Company not found or error: {error}</div>
        </div>
      </AppLayout>
    );
  }

  // Placeholder data for linked contacts, timeline, reminders
  const linkedContacts = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+0987654321",
    },
  ];

  const recentTimeline = [
    { id: "1", date: "2023-10-01", event: "Initial contact" },
    { id: "2", date: "2023-10-05", event: "Proposal sent" },
    { id: "3", date: "2023-10-10", event: "Meeting scheduled" },
    { id: "4", date: "2023-10-15", event: "Follow-up call" },
    { id: "5", date: "2023-10-20", event: "Contract signed" },
  ];

  const openReminders = [
    { id: "1", title: "Follow-up call", due: "2023-10-25" },
    { id: "2", title: "Send invoice", due: "2023-10-28" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div>
          <p className="text-muted-foreground text-sm">
            Home {">"} Companies {">"} {company.firmenname}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="font-semibold text-3xl tracking-tight">{company.firmenname}</h1>
              <Badge
                className={
                  company.status === "won"
                    ? "bg-emerald-600 text-white"
                    : company.status === "lost"
                      ? "bg-rose-600 text-white"
                      : "bg-amber-600 text-white"
                }
              >
                {company.status}
              </Badge>
            </div>
            <Button>Edit</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                {company.stadt}, {company.land}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <Mail className="mr-2 inline h-4 w-4" />
                contact@{company.firmenname.toLowerCase().replace(/\s+/g, "")}
                .com
              </p>
              <p>
                <Phone className="mr-2 inline h-4 w-4" />
                +1 234 567 890
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Anchor className="mr-2 h-5 w-5" />
                Marine Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Distance to water: {company.wasserdistanz || "N/A"} km</p>
              <p>Water type: {company.wassertyp || "N/A"}</p>
              <p>
                Coordinates: {company.lat || "N/A"}, {company.lon || "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Linked Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>{contact.name}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Recent Timeline (Last 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTimeline.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.event}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Open Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openReminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>{reminder.title}</TableCell>
                    <TableCell>{reminder.due}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
