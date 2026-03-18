import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Mail, Send } from 'lucide-react'

export default async function MassEmailPage() {
  // Fetch email templates
  const { data: templates, error: templatesError } = await supabase
    .from('email_templates')
    .select('*')

  if (templatesError) {
    console.error('Error fetching templates:', templatesError)
  }

  // Fetch send history
  const { data: history, error: historyError } = await supabase
    .from('email_log')
    .select('*')
    .order('sent_at', { ascending: false })

  if (historyError) {
    console.error('Error fetching history:', historyError)
  }

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Home {'>'} Mass Email</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mass Email</h1>
        </div>
        <Button className="bg-[#24BACC] hover:bg-[#1da0a8] text-white">New Campaign</Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Send History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>{template.body?.substring(0, 50)}...</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No templates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Send History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.recipient}</TableCell>
                      <TableCell>{log.subject}</TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell>{log.sent_at}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No send history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="mr-2 h-5 w-5" />
            Send Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-companies">All Companies</SelectItem>
                <SelectItem value="all-contacts">All Contacts</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="won">Won Deals</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Subject" />
          <Textarea placeholder="Email body" rows={6} />
          <Button className="bg-[#24BACC] hover:bg-[#1da0a8] text-white">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
