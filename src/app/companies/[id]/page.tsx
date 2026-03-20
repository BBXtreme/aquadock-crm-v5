"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Phone, Mail, Anchor, Calendar, Bell } from "lucide-react";
import { getCompanyById } from "@/lib/supabase/services/companies";
import { createClient } from "@/lib/supabase/browser";
import AppLayout from "@/components/layout/AppLayout";

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [company, setCompany] = useState<any>(null);
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
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          <div>Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !company) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
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
      <div className="container mx-auto p-6 lg:p-8 space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">
            Home {">"} Companies {">"} {company.firmenname}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-semibold tracking-tight">
                {company.firmenname}
              </h1>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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

          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <Mail className="inline mr-2 h-4 w-4" />
                contact@{company.firmenname.toLowerCase().replace(/\s+/g, "")}.com
              </p>
              <p>
                <Phone className="inline mr-2 h-4 w-4" />
                +1 234 567 890
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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
