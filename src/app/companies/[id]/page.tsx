"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Anchor, Bell, Calendar, Mail, MapPin, Phone } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { getCompanyById } from "@/lib/supabase/services/companies";
import { useUpdateCompany, useDeleteCompany } from "@/hooks/useCompanyMutations";
import type { Company } from "@/lib/supabase/types";

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Partial<Company>>({});

  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const supabase = createClient();
      return getCompanyById(id, supabase);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();
  const { mutate: deleteCompany, isPending: isDeleting } = useDeleteCompany();

  // Placeholder data for linked contacts, timeline, reminders
  const linkedContacts = useMemo(
    () => [
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
    ],
    [],
  );

  const recentTimeline = useMemo(
    () => [
      { id: "1", date: "2023-10-01", event: "Initial contact" },
      { id: "2", date: "2023-10-05", event: "Proposal sent" },
      { id: "3", date: "2023-10-10", event: "Meeting scheduled" },
      { id: "4", date: "2023-10-15", event: "Follow-up call" },
      { id: "5", date: "2023-10-20", event: "Contract signed" },
    ],
    [],
  );

  const openReminders = useMemo(
    () => [
      { id: "1", title: "Follow-up call", due: "2023-10-25" },
      { id: "2", title: "Send invoice", due: "2023-10-28" },
    ],
    [],
  );

  const handleEditCompany = () => {
    if (company) {
      updateCompany({ id, updates: editCompany });
      setIsEditDialogOpen(false);
      setEditCompany({});
    }
  };

  const handleDeleteCompany = () => {
    if (confirm("Are you sure you want to delete this company?")) {
      deleteCompany(id);
    }
  };

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`card-skeleton-${i}`} className="h-32 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`table-skeleton-${i}`} className="h-48 w-full" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div>Company not found.</div>
        </div>
      </AppLayout>
    );
  }

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
            <div className="flex gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Edit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Company</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="firmenname">Firmenname</Label>
                      <Input
                        id="firmenname"
                        value={editCompany.firmenname ?? company.firmenname}
                        onChange={(e) => setEditCompany({ ...editCompany, firmenname: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="kundentyp">Kundentyp</Label>
                      <Select
                        value={editCompany.kundentyp ?? company.kundentyp}
                        onValueChange={(value) => setEditCompany({ ...editCompany, kundentyp: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="marina">Marina</SelectItem>
                          <SelectItem value="camping">Camping</SelectItem>
                          <SelectItem value="sonstige">Sonstige</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editCompany.status ?? company.status}
                        onValueChange={(value) => setEditCompany({ ...editCompany, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
                          <SelectItem value="akquise">Akquise</SelectItem>
                          <SelectItem value="angebot">Angebot</SelectItem>
                          <SelectItem value="gewonnen">Gewonnen</SelectItem>
                          <SelectItem value="verloren">Verloren</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="value">Value (€)</Label>
                      <Input
                        id="value"
                        type="number"
                        value={editCompany.value ?? company.value ?? 0}
                        onChange={(e) => setEditCompany({ ...editCompany, value: Number(e.target.value) })}
                      />
                    </div>
                    <Button onClick={handleEditCompany} disabled={isUpdating}>
                      {isUpdating ? "Updating..." : "Update"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" onClick={handleDeleteCompany} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
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
