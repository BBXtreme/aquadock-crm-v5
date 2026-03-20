"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import KPICards from '@/components/dashboard/KPICards'
import { TrendingUp, TrendingDown } from 'lucide-react'
import SalesPipelineFunnel from '@/components/dashboard/SalesPipelineFunnel'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [companies, setCompanies] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all companies for consistent preview and calculations
        const { data: compData, error: compError } = await supabase
          .from('companies')
          .select('*')

        if (compError) throw compError
        setCompanies(compData || [])

        const { data: timeData } = await supabase
          .from('timeline')
          .select('*, companies(firmenname)')
          .order('created_at', { ascending: false })
          .limit(10)
        setTimeline(timeData || [])

        const { data: remData } = await supabase.from('reminders').select('*')
        setReminders(remData || [])

      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>

  // KPI calculations
  const totalCompanies = companies.length
  const leads = companies.filter(c => c.status === 'lead').length
  const won = companies.filter(c => c.status === 'won').length
  const valueSum = companies.reduce((sum, c) => sum + (Number(c.value) || 0), 0)
  const wonValue = companies.filter(c => c.status === 'won').reduce((sum, c) => sum + (Number(c.value) || 0), 0)
  const openReminders = reminders.filter(r => r.status === 'open').length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newCompaniesThisMonth = companies.filter(c => new Date(c.created_at) >= startOfMonth).length
  const avgValue = totalCompanies > 0 ? valueSum / totalCompanies : 0

  const kundentypCounts = companies.reduce<Record<string, number>>((acc, company) => {
    const typ = company.kundentyp || 'sonstige'
    acc[typ] = (acc[typ] || 0) + 1
    return acc
  }, {})

  const sortedKundentyp = Object.entries(kundentypCounts).sort((a, b) => b[1] - a[1])
  const topKundentyp = sortedKundentyp[0]?.[0] || 'N/A'

  const companiesByKundentyp = Object.entries(kundentypCounts).map(([kundentyp, count]) => ({
    kundentyp,
    count
  }))

  const kpis = [
    { title: 'Total Companies', value: totalCompanies, changePercent: 12, subtitle: 'from last month' },
    { title: 'Active Leads', value: leads, changePercent: 8, subtitle: 'from last month' },
    { title: 'Won Deals', value: won, changePercent: 20, subtitle: 'from last month' },
    { title: 'Total Value', value: `€${wonValue.toLocaleString()}`, changePercent: 15, subtitle: 'from last month' },
    { title: 'New This Month', value: newCompaniesThisMonth, changePercent: 25, subtitle: 'companies added' },
    { title: 'Avg Value', value: `€${avgValue.toLocaleString()}`, changePercent: 10, subtitle: 'average deal value' },
    { title: 'Top Kundentyp', value: topKundentyp, changePercent: 5, subtitle: 'most common type' },
  ]

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Home</p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <KPICards kpis={kpis} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Companies by Kundentyp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Bar chart placeholder (use Recharts or similar)</p>
              <div className="ml-6 space-y-2">
                {companiesByKundentyp.map((item) => (
                  <div key={item.kundentyp} className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-primary rounded-full" />
                    <span className="text-sm font-medium">{item.kundentyp}: {item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.length > 0 ? (
                timeline.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg">
                    <div className="w-3 h-3 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.companies?.firmenname || 'Unknown'} • {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SalesPipelineFunnel
        leads={680}
        qualified={480}
        proposal={210}
        negotiation={120}
        won={45}
        changePercent={18.2}
        changeTextColor="green"
      />

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <span>Debug Info</span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supabase Connection Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96">
                {JSON.stringify(
                  {
                    status: error ? 'Error' : 'Connected',
                    rowCount: companies.length,
                    sampleData: companies.slice(0, 2),
                    error: error ?? null,
                  },
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
