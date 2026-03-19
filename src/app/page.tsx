import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import KPICards from '@/components/dashboard/KPICards'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default async function Home() {
  // Test-Abfrage: Versuche, eine Tabelle zu lesen (auch wenn sie noch nicht existiert)
  const { data: companies, error, count } = await supabase
    .from('companies') // ← ändere später zu deiner echten Tabelle
    .select('*', { count: 'exact' })
    .limit(5)

  // Fetch all companies for aggregations
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('*')

  // Fetch recent timeline entries
  const { data: timeline } = await supabase
    .from('timeline')
    .select('*, companies(firmenname)')
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch reminders for KPI
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')

  // Calculate KPIs
  const totalCompanies = allCompanies?.length || 0
  const leads = allCompanies?.filter(c => c.status === 'lead').length || 0
  const won = allCompanies?.filter(c => c.status === 'won').length || 0
  const valueSum = allCompanies?.reduce((sum, c) => sum + (c.value || 0), 0) || 0
  const wonValue = allCompanies?.filter(c => c.status === 'won').reduce((sum, c) => sum + (c.value || 0), 0) || 0
  const openReminders = reminders?.filter(r => r.status === 'open').length || 0

  // New KPIs
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newCompaniesThisMonth = allCompanies?.filter(c => new Date(c.created_at) >= startOfMonth).length || 0
  const avgValue = totalCompanies > 0 ? valueSum / totalCompanies : 0

  // Top Kundentyp
  const kundentypCounts = allCompanies?.reduce((acc, c) => {
    acc[c.kundentyp] = (acc[c.kundentyp] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  const topKundentyp = Object.entries(kundentypCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // Companies by kundentyp for chart
  const companiesByKundentyp = Object.entries(kundentypCounts).map(([kundentyp, count]) => ({
    kundentyp,
    count
  }))

  const kpis = [
    { title: 'Total Companies', value: totalCompanies, changePercent: 12, subtitle: 'from last month' },
    { title: 'Active Leads', value: leads, changePercent: 8, subtitle: 'from last month' },
    { title: 'Open Reminders', value: openReminders, changePercent: -5, subtitle: 'from last month' },
    { title: 'Total Value', value: `€${wonValue.toLocaleString()}`, changePercent: 20, subtitle: 'from last month' },
  ]

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Home</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{totalCompanies}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+12%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">from last month</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{leads}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+8%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">from last month</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{won}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+20%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">from last month</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">€{valueSum.toLocaleString()}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+15%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">from last month</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{newCompaniesThisMonth}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+25%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">companies added</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">€{avgValue.toLocaleString()}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+10%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">average deal value</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Kundentyp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{topKundentyp}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-4 w-4 text-[#24BACC]" />
              <span className="text-sm font-medium text-[#24BACC]">+5%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">most common type</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Companies by Kundentyp</h3>
            <div className="h-64 bg-marine-50 dark:bg-marine-900 rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Bar chart placeholder</p>
              <div className="ml-4 space-y-2">
                {companiesByKundentyp.map((item) => (
                  <div key={item.kundentyp} className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-marine-500 rounded"></div>
                    <span className="text-sm">{item.kundentyp}: {item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {timeline?.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-3 bg-marine-50 dark:bg-marine-900 rounded-lg">
                  <div className="w-2 h-2 bg-marine-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.companies?.firmenname} • {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <KPICards kpis={kpis} />

      <Collapsible>
        <CollapsibleTrigger className="flex items-center space-x-2 text-sm font-medium">
          <span>Debug Info</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Supabase-Verbindung</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(
                  {
                    status: error ? 'Error' : 'Connected',
                    rowCount: count ?? 0,
                    data: companies ?? [],
                    error: error?.message ?? null,
                    envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
                    envKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
                  },
                  null,
                  2
                )}
              </pre>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                {error
                  ? `Fehler: ${error.message} (Tabelle 'companies' existiert vielleicht noch nicht – normal beim Start)`
                  : `Erfolg! ${count ?? 0} Zeilen gefunden.`}
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
