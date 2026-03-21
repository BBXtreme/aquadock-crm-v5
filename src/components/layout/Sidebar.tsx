'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, Building, Users, Clock, Bell, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/companies', label: 'Companies', icon: Building },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/mass-email', label: 'Mass Email', icon: Mail },
];

export default function Sidebar({ isCollapsed, isMobile, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button variant="ghost" onClick={onToggle} className="mb-4">
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
                  className={cn('w-full justify-start', pathname === item.href && 'bg-accent')}
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
  );

  if (isMobile) {
    return (
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
    );
  }

  return (
    <aside className={`bg-muted transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {sidebarContent}
    </aside>
  );
}
