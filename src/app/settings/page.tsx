'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Bell, Palette, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(false)
  const [theme, setTheme] = useState('system')
  const [language, setLanguage] = useState('en')

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Home {'>'} Settings</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Push Notifications</Label>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailAlerts">Email Alerts</Label>
              <Switch
                id="emailAlerts"
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
              />
            </div>
            <p className="text-sm text-muted-foreground">Configure how you receive notifications</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">Customize your app appearance</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Not configured</p>
              <Button variant="outline" size="sm">Enable 2FA</Button>
            </div>
            <div className="space-y-2">
              <Label>Data Export</Label>
              <p className="text-sm text-muted-foreground">Download your data</p>
              <Button variant="outline" size="sm">Export Data</Button>
            </div>
            <p className="text-sm text-muted-foreground">Manage your privacy and security settings</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Advanced
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Access</Label>
              <p className="text-sm text-muted-foreground">Manage API keys and integrations</p>
              <Button variant="outline" size="sm">Manage API</Button>
            </div>
            <div className="space-y-2">
              <Label>Data Retention</Label>
              <p className="text-sm text-muted-foreground">Configure data retention policies</p>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <p className="text-sm text-muted-foreground">Advanced settings for power users</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Delete Account</Label>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            <Button variant="destructive" size="sm">Delete Account</Button>
          </div>
          <p className="text-sm text-red-600">This action cannot be undone</p>
        </CardContent>
      </Card>
    </div>
  )
}
