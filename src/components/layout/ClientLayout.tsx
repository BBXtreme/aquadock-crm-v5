'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Menu,
  Home,
  Building,
  Users,
  Clock,
  Bell,
  Mail,
  Search,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
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
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)

  const pathname = usePathname()

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Theme persistence
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
    setTheme(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])

  // Simulate / replace with real auth check
  useEffect(() => {
    // TODO: Replace with real Supabase auth listener
    const timer = setTimeout(() => {
      // Mock user
      setUser({ name: 'BangLee', email: 'user@example.com' })
      setAuthLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const handleLogout = () => {
    // TODO: Real logout with Supabase
    setUser(null)
    // redirect('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    pathname === item.href && "bg-accent text-accent-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )

  const header = (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-card text-card-foreground shadow-sm">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold tracking-tight">AquaDock CRM</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 w-64"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/01.png" alt={user?.name || 'User'} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
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
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex">
          {!isMobile && (
            <aside
              className={cn(
                "bg-sidebar text-sidebar-foreground border-r transition-all duration-300",
                isCollapsed ? "w-16" : "w-64"
              )}
            >
              {sidebarContent}
            </aside>
          )}
          <div className="flex-1 flex flex-col">
            {header}
            <main className="flex-1">
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  {children}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </div>
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="fixed bottom-4 right-4 z-50">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
