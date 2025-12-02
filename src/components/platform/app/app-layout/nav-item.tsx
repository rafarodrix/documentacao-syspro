"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

export type NavItemType = {
    title: string;
    href: string;
    icon: LucideIcon;
    roles?: string[];
    badge?: string;
};

interface NavItemProps {
    item: NavItemType;
    isActive: boolean;
}

export function NavItem({ item, isActive }: NavItemProps) {
    return (
        <Link href={item.href}>
            <span className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border border-transparent",
                isActive
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 border-primary/10"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/50"
            )}>
                <div className="flex items-center gap-3">
                    <item.icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground opacity-70 group-hover:opacity-100"
                    )} />
                    {item.title}
                </div>

                {/* Badge de Novidade ou Notificação */}
                {item.badge ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 bg-background border-border/60 shadow-sm">
                        {item.badge}
                    </Badge>
                ) : isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
            </span>
        </Link>
    );
}