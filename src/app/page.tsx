import { supabase } from '@/lib/supabase'

export default async function Home() {
  // Test-Abfrage: Versuche, eine Tabelle zu lesen (auch wenn sie noch nicht existiert)
  const { data, error, count } = await supabase
    .from('companies') // ← ändere später zu deiner echten Tabelle
    .select('*', { count: 'exact' })
    .limit(5)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">
          AquaDock CRM v5 – Test Dashboard
        </h1>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">Supabase-Verbindung</h2>

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
        </div>

        <p className="mt-8 text-zinc-500 dark:text-zinc-400">
          Nächster Schritt: Erstelle die Tabelle <code>companies</code> in Supabase.
        </p>
      </div>
    </div>
  )
}