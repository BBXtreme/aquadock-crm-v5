'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, LogOut, Upload } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          setError(error.message)
        } else if (user) {
          setUser(user)
          setDisplayName(user.user_metadata?.display_name || '')
        } else {
          setError('No user found')
        }
      } catch (err) {
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    getUser()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Profile updated successfully!')
      }
    } catch (err) {
      setMessage('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 lg:p-8">
        <Alert>
          <AlertDescription>No user data available. Please try logging in again.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Home {'>'} Profile</p>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.user_metadata?.avatar_url || '/placeholder-avatar.jpg'} alt="Profile" />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">{displayName || 'No display name'}</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePicture">Profile Picture</Label>
                <Input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  disabled
                />
                <p className="text-sm text-muted-foreground">Upload functionality placeholder</p>
              </div>
              <Button
                type="submit"
                className="bg-[#24BACC] hover:bg-[#1da0a8] text-white"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
            {message && (
              <Alert className="mt-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="flex items-center"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
