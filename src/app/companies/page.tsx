import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function CompaniesPage() {
  // Fetch all companies
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, firmenname, kundentyp, status, value, stadt, land, created_at')
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button>Quick Create</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{won}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Sum</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${valueSum.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Companies Table Placeholder</h3>
        <p className="text-muted-foreground">Table implementation pending</p>
      </div>
    </div>
  )
}
