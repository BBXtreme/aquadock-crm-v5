import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

export default async function Home() {
  // Test-Abfrage: Versuche, eine Tabelle zu lesen (auch wenn sie noch nicht existiert)
  const { data, error, count } = await supabase
    .from('companies') // ← ändere später zu deiner echten Tabelle
    .select('*', { count: 'exact' })
    .limit(5)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Home</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      </div>

      <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary">+12%</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">128</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary">+8%</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-rose-600">-5%</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary">+20%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">Chart Placeholder</h3>
          <p className="text-muted-foreground">Placeholder for charts</p>
        </CardContent>
      </Card>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center space-x-2 text-sm font-medium">
          <span>Debug Info</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Supabase-Verbindung</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(
                  {
                    status: error ? 'Error' : 'Connected',
                    rowCount: count ?? 0,
                    data: data ?? [],
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
