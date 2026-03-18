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
import { Bell, AlertTriangle, Calendar, Star } from 'lucide-react'
import { isAfter, isThisWeek, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default async function RemindersPage() {
  // Fetch all reminders with company name
  const { data: allReminders, error } = await supabase
    .from('reminders')
    .select('*, companies(firmenname)')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching reminders:', error)
  }

  // Default filter: open only
  const reminders = allReminders?.filter(r => r.status === 'open') || []

  // Calculate KPIs from all reminders
  const openReminders = allReminders?.filter(r => r.status === 'open').length || 0
  const overdue = allReminders?.filter(r => r.status === 'open' && isAfter(new Date(), new Date(r.due_date))).length || 0
  const thisWeek = allReminders?.filter(r => r.status === 'open' && isThisWeek(new Date(r.due_date))).length || 0
  const highPriority = allReminders?.filter(r => r.status === 'open' && r.priority === 'high').length || 0

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Home {'>'} Reminders</p>
          <h1 className="text-3xl font-semibold tracking-tight">Reminders</h1>
        </div>
        <Button className="bg-[#24BACC] hover:bg-[#1da0a8] text-white">New Reminder</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openReminders}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdue}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeek}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriority}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex space-x-2">
        <Button variant="outline">All</Button>
        <Button variant="outline">Open</Button>
        <Button variant="outline">Overdue</Button>
        <Button variant="outline">My Tasks</Button>
      </div>

      <Card className="shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => {
                  const isOverdue = isAfter(new Date(), new Date(reminder.due_date))
                  return (
                    <TableRow key={reminder.id}>
                      <TableCell>{reminder.title}</TableCell>
                      <TableCell>
                        <Link href={`/companies/${reminder.company_id}`} className="text-blue-600 hover:underline">
                          {reminder.companies?.firmenname}
                        </Link>
                      </TableCell>
                      <TableCell className={isOverdue ? 'text-rose-500' : ''}>
                        {formatDistanceToNow(new Date(reminder.due_date), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge className={reminder.priority === 'high' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}>
                          {reminder.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={reminder.status === 'open' ? 'bg-emerald-500 text-white' : 'bg-zinc-500 text-white'}>
                          {reminder.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{reminder.assigned_to}</TableCell>
                    </TableRow>
                  )
                })}
                {!reminders.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
