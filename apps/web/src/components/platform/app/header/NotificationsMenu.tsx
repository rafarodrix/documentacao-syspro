"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Info, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationLevel = "critical" | "warning" | "info";

type NotificationItem = {
  id: string;
  level: NotificationLevel;
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
  generatedAt: string;
};

function levelIcon(level: NotificationLevel) {
  if (level === "critical") return ShieldAlert;
  if (level === "warning") return AlertTriangle;
  return Info;
}

function levelClass(level: NotificationLevel): string {
  if (level === "critical") return "text-red-500";
  if (level === "warning") return "text-amber-500";
  return "text-sky-500";
}

function relativeTime(dateLike: string): string {
  const now = new Date();
  const date = new Date(dateLike);
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes}min`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
  return `${Math.floor(diffMinutes / 1440)}d`;
}

export function NotificationsMenu() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/platform/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }

      const data: NotificationsResponse = await res.json();
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(() => fetchNotifications(true), 60_000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const badgeText = useMemo(() => {
    if (unreadCount <= 0) return null;
    if (unreadCount > 9) return "9+";
    return String(unreadCount);
  }, [unreadCount]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Notificacoes"
        >
          <Bell className="h-4 w-4" />
          {badgeText && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white leading-4 text-center">
              {badgeText}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="px-3 py-2.5 flex items-center justify-between">
          <DropdownMenuLabel className="p-0 text-sm">Notificacoes</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fetchNotifications(true)}
            aria-label="Atualizar notificacoes"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="max-h-[360px] overflow-y-auto p-1">
          {loading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">Carregando alertas...</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">Sem alertas no momento.</div>
          ) : (
            items.map((item) => {
              const Icon = levelIcon(item.level);
              return (
                <DropdownMenuItem key={item.id} asChild className="items-start gap-2.5 py-2.5 cursor-pointer">
                  <Link href={item.href}>
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", levelClass(item.level))} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-4">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-auto">{relativeTime(item.createdAt)}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="px-3 py-2">
          <Link href="/portal/chamados" className="text-xs text-primary hover:underline">
            Ver central de chamados
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
