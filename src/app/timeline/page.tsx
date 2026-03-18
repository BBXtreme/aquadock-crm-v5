import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default async function TimelinePage() {
  // Fetch recent timeline entries with company name
  const { data: timeline, error } = await supabase
    .from('timeline')
    .select('*, companies(firmenname)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching timeline:', error)
  }

  // Get unique companies and types for filters
  const companies = Array.from(new Set(timeline?.map(t => t.companies?.firmenname).filter(Boolean)))
  const types = Array.from(new Set(timeline?.map(t => t.activity_type).filter(Boolean)))

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Home {'>'} Timeline</p>
          <h1 className="text-3xl font-semibold tracking-tight">Timeline</h1>
        </div>
        <Button>New Timeline Entry</Button>
      </div>

      <div className="flex space-x-4">
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
        <Select>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {timeline?.map((entry) => (
          <Card key={entry.id} className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                    <Link href={`/companies/${entry.company_id}`} className="text-blue-600 hover:underline">
                      {entry.companies?.firmenname}
                    </Link>
                    <Badge variant="outline">{entry.activity_type}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold">{entry.title}</h3>
                  <p className="text-muted-foreground">{entry.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || (
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">No timeline entries found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
