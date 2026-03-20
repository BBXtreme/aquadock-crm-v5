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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Star, Building, RefreshCw } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(firmenname)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setContacts(data || []);
      setCompanies(
        Array.from(
          new Set(data?.map((c) => c.companies?.firmenname).filter(Boolean)),
        ),
      );
    } catch (err: any) {
      setError(err.message || "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.primary).length;
  const companiesWithContacts = new Set(contacts.map((c) => c.company_id)).size;

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Home {">"} Contacts
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Contacts
              </h1>
            </div>
            <Button>New Contact</Button>
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
            <p className="text-sm text-muted-foreground">Home {">"} Contacts</p>
            <h1 className="text-3xl font-semibold tracking-tight">Contacts</h1>
          </div>
          <Button>New Contact</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contacts
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalContacts}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Primary Contacts
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{primaryContacts}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Companies with Contacts
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {companiesWithContacts}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Input placeholder="Search contacts..." className="max-w-sm" />
                <Select>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vorname Nachname</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefon</TableHead>
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
                            <Link
                              href={`/companies/${contact.company_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {contact.companies?.firmenname}
                            </Link>
                          </TableCell>
                          <TableCell>{contact.position}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.telefon}</TableCell>
                          <TableCell>
                            {contact.primary && (
                              <Badge className="bg-[#24BACC] text-white">
                                Primary
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!contacts.length && (
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
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
