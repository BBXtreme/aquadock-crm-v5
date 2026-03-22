"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Link from "next/link";

import { User, Building, Edit, Trash, Mail, Phone, Smartphone, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/browser";
import { deleteContact } from "@/lib/supabase/services/contacts";
import type { Contact } from "@/lib/supabase/types";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!id || id === "undefined") {
      setError("Invalid contact ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/contacts/${id}`);
      const data = await response.json();
      if (data.success) {
        setContact(data.contact);
      } else {
        setError(data.error || "Failed to load contact");
      }
    } catch (err) {
      setError("Failed to load contact");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDeleteContact = async () => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        const supabase = createClient();
        await deleteContact(id, supabase);
        router.push('/contacts');
      } catch (error) {
        alert('Error deleting contact');
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Contact Not Found</h1>
            <Button onClick={() => router.push("/contacts")}>
              Back to Contacts
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600">
          <Link href="/contacts" className="hover:underline">Contacts</Link> &gt; {contact.vorname} {contact.nachname}
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{contact.vorname} {contact.nachname}</h1>
            {contact.position && (
              <p className="text-gray-600 mt-1">{contact.position}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/contacts?edit=${id}`)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Contact
            </Button>
            <Button onClick={handleDeleteContact} variant="destructive">
              <Trash className="w-4 h-4 mr-2" />
              Delete Contact
            </Button>
            <Button onClick={() => router.push("/contacts")}>
              Back to Contacts
            </Button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-4">
          {contact.is_primary && (
            <Badge variant="secondary">Primary Contact</Badge>
          )}
          {contact.anrede && (
            <Badge variant="outline">{contact.anrede}</Badge>
          )}
        </div>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Vorname</label>
                <p className="text-sm text-gray-900">{contact.vorname || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nachname</label>
                <p className="text-sm text-gray-900">{contact.nachname || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Anrede</label>
                <p className="text-sm text-gray-900">{contact.anrede || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Position</label>
                <p className="text-sm text-gray-900">{contact.position || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                      {contact.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Telefon</label>
                <p className="text-sm text-gray-900">
                  {contact.telefon ? (
                    <a href={`tel:${contact.telefon}`} className="text-blue-600 hover:underline">
                      {contact.telefon}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mobil</label>
                <p className="text-sm text-gray-900">
                  {contact.mobil ? (
                    <a href={`tel:${contact.mobil}`} className="text-blue-600 hover:underline">
                      {contact.mobil}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Durchwahl</label>
                <p className="text-sm text-gray-900">{contact.durchwahl || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <p className="text-sm text-gray-900">{contact.notes || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Company */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Linked Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contact.companies ? (
              <div>
                <Link href={`/companies/${contact.company_id}`} className="text-blue-600 hover:underline text-lg font-semibold">
                  {contact.companies.firmenname}
                </Link>
                <p className="text-sm text-gray-600 mt-1">Click to view company details</p>
              </div>
            ) : (
              <p className="text-gray-500">No company linked</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
