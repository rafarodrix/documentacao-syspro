"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"

export type NavItemType = {
  title: string
  href: string
  icon: LucideIcon
  roles?: string[]
  badge?: string
  newTab?: boolean
}

interface NavItemProps {
  item: NavItemType
  isActive: boolean
  onClick?: () => void
  collapsed?: boolean
}

export function NavItem({ item, isActive, onClick, collapsed = false }: NavItemProps) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="block min-w-0"
      target={item.newTab ? "_blank" : undefined}
      rel={item.newTab ? "noreferrer" : undefined}
    >
      <span
        title={collapsed ? item.title : undefined}
        className={cn(
          "group flex w-full min-w-0 items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium",
          "transition-all duration-200 border border-transparent",
          collapsed && "px-2",
          isActive
            ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 border-primary/10"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/50",
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-3", collapsed && "w-full justify-center")}>
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground opacity-70 group-hover:opacity-100",
            )}
          />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </div>

        {!collapsed && item.badge ? (
          <Badge
            variant="secondary"
            className="h-5 shrink-0 border-border/60 bg-background px-1.5 py-0 text-[10px] shadow-sm"
          >
            {item.badge}
          </Badge>
        ) : null}
      </span>
    </Link>
  )
}
