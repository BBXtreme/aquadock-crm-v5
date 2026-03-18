'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [redirectTo, setRedirectTo] = useState('')
  const router = useRouter()

  useEffect(() => {
    setRedirectTo(`${window.location.origin}/dashboard`)
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border border-border bg-card text-card-foreground shadow-sm rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Sign In to AquaDock CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center space-x-2 mb-4">
            <Button
              variant={view === 'sign_in' ? 'default' : 'outline'}
              onClick={() => setView('sign_in')}
              className="flex-1"
            >
              Sign In
            </Button>
            <Button
              variant={view === 'sign_up' ? 'default' : 'outline'}
              onClick={() => setView('sign_up')}
              className="flex-1"
            >
              Sign Up
            </Button>
          </div>
          <Auth
            supabaseClient={supabase}
            view={view}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#24BACC',
                    brandAccent: '#1da0a8',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={redirectTo}
            onlyThirdPartyProviders={false}
            magicLink={true}
            showLinks={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
