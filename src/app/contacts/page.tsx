import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Users, Star, Building } from 'lucide-react'
import Link from 'next/link'

export default async function ContactsPage() {
  // Fetch all contacts with company name
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*, companies(firmenname)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contacts:', error)
  }

  // Calculate metrics
  const totalContacts = contacts?.length || 0
  const primaryContacts = contacts?.filter(c => c.primary).length || 0
  const companiesWithContacts = new Set(contacts?.map(c => c.company_id)).size || 0

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Home {'>'} Contacts</p>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        </div>
        <Button className="bg-[#24BACC] hover:bg-[#24BACC]/90">New Contact</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Contacts</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{primaryContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies with Contacts</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesWithContacts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Input placeholder="Search contacts..." className="max-w-sm" />
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
                  {contacts?.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>{contact.vorname} {contact.nachname}</TableCell>
                      <TableCell>
                        <Link href={`/companies/${contact.company_id}`} className="text-blue-600 hover:underline">
                          {contact.companies?.firmenname}
                        </Link>
                      </TableCell>
                      <TableCell>{contact.position}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.telefon}</TableCell>
                      <TableCell>
                        {contact.primary && <Badge>Primary</Badge>}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
