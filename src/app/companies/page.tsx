import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CompaniesTable from '@/components/tables/CompaniesTable'
import { Building, Users, Trophy, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default async function CompaniesPage() {
  // Fetch all companies
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching companies:', error)
  }

  // Calculate metrics
  const totalCompanies = companies?.length || 0
  const leads = companies?.filter(c => c.status === 'lead').length || 0
  const won = companies?.filter(c => c.status === 'won').length || 0
  const valueSum = companies?.reduce((sum, c) => sum + (c.value || 0), 0) || 0

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Home {'>'} Companies</p>
          <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
        </div>
        <div className="flex space-x-2">
          <Link href="/import">
            <Button variant="outline">Import CSV</Button>
          </Link>
          <Button>New Company</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads}</div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{won}</div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{valueSum.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
        <CardContent className="p-6">
          <CompaniesTable companies={companies || []} />
        </CardContent>
      </Card>
    </div>
  )
}
