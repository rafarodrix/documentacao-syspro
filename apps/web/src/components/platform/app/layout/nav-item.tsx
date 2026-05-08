"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@dosc-syspro/ui"
import { LucideIcon } from "lucide-react"

export type NavItemType = {
  title: string
  href: string
  icon: LucideIcon
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
  const inner = (
    <Link
      href={item.href}
      onClick={onClick}
      className="block min-w-0"
      target={item.newTab ? "_blank" : undefined}
      rel={item.newTab ? "noreferrer" : undefined}
    >
      <span
        className={cn(
          "group flex w-full min-w-0 items-center justify-between rounded-md py-2 text-sm font-medium",
          "transition-colors duration-150",
          collapsed ? "px-2 justify-center" : "px-3",
          isActive
            ? "bg-primary/8 text-primary border-l-2 border-primary"
            : "text-muted-foreground border-l-2 border-transparent hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "w-full justify-center")}>
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground",
            )}
          />
          {!collapsed && (
            <span className="truncate leading-none">{item.title}</span>
          )}
        </div>

        {!collapsed && item.badge ? (
          <Badge
            variant="secondary"
            className="h-4.5 shrink-0 border-border/50 bg-muted px-1.5 py-0 text-[10px] font-medium"
          >
            {item.badge}
          </Badge>
        ) : null}
      </span>
    </Link>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return inner
}
