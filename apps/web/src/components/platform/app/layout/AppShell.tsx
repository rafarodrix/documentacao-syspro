"use client"

import type { Role } from "@prisma/client"
import { useEffect, useState, type ReactNode } from "react"
import { AppSidebar } from "@/components/platform/app/layout/AppSidebar"
import { MobileHeader } from "@/components/platform/app/layout/MobileHeader"
import { ClientHeader } from "@/components/platform/app/header/ClientHeader"

interface AppShellUser {
  name: string
  email: string
  image?: string | null
  role: Role
}

interface AppShellProps {
  user: AppShellUser
  children: ReactNode
  initialActiveSessionsCount?: number
}

const STORAGE_KEY = "trilink.sidebar.collapsed"

export function AppShell({ user, children, initialActiveSessionsCount }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setCollapsed(saved === "1")
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0")
  }, [collapsed])

  return (
    <div className="flex h-screen w-full bg-muted/5 overflow-hidden">
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50">
        <AppSidebar user={user} collapsed={collapsed} />
      </aside>

      <div className={`flex-1 flex flex-col h-full transition-[padding-left] duration-200 ${collapsed ? "md:pl-20" : "md:pl-72"}`}>
        <MobileHeader user={user} />
        <ClientHeader 
          user={user} 
          sidebarCollapsed={collapsed} 
          onToggleSidebar={() => setCollapsed((prev) => !prev)} 
          initialActiveSessionsCount={initialActiveSessionsCount}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-400 mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


