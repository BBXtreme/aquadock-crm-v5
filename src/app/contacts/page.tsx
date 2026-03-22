"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { getContacts } from "@/lib/supabase/services/contacts";

export default function ContactsPage() {
  const {
    data: contacts = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      return getContacts(supabase);
    },
  });

  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.is_primary).length;
  const companiesWithContacts = new Set(contacts.map((c) => c.company_id)).size;

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Contacts</p>
            <h1 className="font-semibold text-3xl tracking-tight">Contacts</h1>
          </div>
          <Button>New Contact</Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{loading ? <Skeleton className="h-8 w-16" /> : totalContacts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Primary Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{loading ? <Skeleton className="h-8 w-16" /> : primaryContacts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Companies with Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {loading ? <Skeleton className="h-8 w-16" /> : companiesWithContacts}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contacts List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <SkeletonList count={5} itemClassName="h-12 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          {contact.vorname} {contact.nachname}
                        </TableCell>
                        <TableCell>
                          {contact.companies?.firmenname ? (
                            <Link href={`/companies/${contact.company_id}`} className="text-primary hover:underline">
                              {contact.companies.firmenname}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{contact.position || "—"}</TableCell>
                        <TableCell>{contact.email || "—"}</TableCell>
                        <TableCell>{contact.telefon || "—"}</TableCell>
                        <TableCell>{contact.is_primary && <Badge variant="secondary">Primary</Badge>}</TableCell>
                      </TableRow>
                    ))}
                    {!contacts.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No contacts found.
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
```