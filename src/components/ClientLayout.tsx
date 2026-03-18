'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Menu, Home, Building, Users, Clock, Bell, Mail, Search, Sun, Moon, User, Settings, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'
import ErrorBoundary from './ErrorBoundary'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/companies', label: 'Companies', icon: Building },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/mass-email', label: 'Mass Email', icon: Mail },
]

interface ClientLayoutProps {
  children: React.ReactNode
}

const LoadingFallback = () => (
  <div className="flex-1 p-6 lg:p-8 space-y-8">
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  </div>
)

const AuthLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#24BACC]" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [theme, setTheme] = useState('light')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])

  useEffect(() => {
    // Simulate auth check delay
    const timer = setTimeout(() => setAuthLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const pathname = usePathname()
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button variant="ghost" onClick={() => setIsCollapsed(!isCollapsed)} className="mb-4">
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    pathname === item.href && "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && <span className="ml-2">{item.label}</span>}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )

  const header = (
    <header className="flex items-center justify-between p-4 border-b shadow-sm">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">AquaDock CRM</h1>
      </div>
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" className="relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">3</Badge>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href="/profile">
              <DropdownMenuItem className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )

  if (authLoading) {
    return <AuthLoadingSpinner />
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen">
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="fixed top-4 left-4 z-50">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          <aside className={`bg-muted transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            {sidebarContent}
          </aside>
        )}
        <div className="flex-1 flex flex-col">
          {header}
          <Suspense fallback={<LoadingFallback />}>
            <main className="flex-1 p-6 lg:p-8">
              {children}
            </main>
          </Suspense>
          <Toaster richColors position="top-right" />
        </div>
      </div>
    </ErrorBoundary>
  )
}
