'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className="flex h-screen">
      <Sidebar
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
