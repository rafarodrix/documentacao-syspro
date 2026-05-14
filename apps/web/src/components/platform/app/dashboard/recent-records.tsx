import Link from "next/link"
import { Badge, Button } from "@dosc-syspro/ui";
import { ArrowUpRight, UserRound, Users } from "lucide-react"
import { EmptyState, SectionCard } from "@/components/patterns";

export interface RecentRecordItem {
  id: string
  title: string
  subtitle?: string | null
  meta?: string | null
  createdAt: Date | string | null
  tags?: string[]
}

interface RecentRecordsProps {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  viewAllHref: string
  createHref?: string
  createLabel?: string
  items: RecentRecordItem[]
  icon?: "contact" | "user"
}

function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "Data indisponivel"

  const normalized = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(normalized.getTime())) return "Data invalida"

  const now = new Date()
  const diff = Math.floor((now.getTime() - normalized.getTime()) / 1000 / 60 / 60)
  if (diff < 1) return "Agora mesmo"
  if (diff < 24) return `Ha ${diff}h`

  const days = Math.floor(diff / 24)
  if (days === 1) return "Ontem"
  if (days < 7) return `Ha ${days} dias`

  return normalized.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function getInitials(value: string) {
  return value
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function RecentRecords({
  title,
  description,
  emptyTitle,
  emptyDescription,
  viewAllHref,
  createHref,
  createLabel,
  items,
  icon = "contact",
}: RecentRecordsProps) {
  const Icon = icon === "user" ? Users : UserRound

  return (
    <SectionCard
      title={title}
      description={description}
      action={
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
          <Link href={viewAllHref}>
            Ver todos
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      }
      className="w-full border-border/50 flex flex-col"
      contentClassName="flex-1"
    >
      {items.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={emptyTitle}
            description={emptyDescription}
            className="h-full min-h-60"
            action={createHref && createLabel ? { label: createLabel, href: createHref } : undefined}
          />
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href={viewAllHref}
                className="flex items-center gap-3 px-3 py-2.5 -mx-1 rounded-lg hover:bg-muted/60 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-linear-to-br from-muted to-muted/60 border border-border/50 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground group-hover:border-border/80 transition-colors">
                  {getInitials(item.title)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate leading-tight">{item.title}</span>
                  </div>
                  {item.subtitle ? (
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subtitle}</div>
                  ) : null}
                  {item.meta ? <div className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{item.meta}</div> : null}
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <p className="text-[11px] text-muted-foreground">{formatRelativeDate(item.createdAt)}</p>
                  {item.tags?.length ? (
                    <div className="flex justify-end gap-1 flex-wrap max-w-44">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
    </SectionCard>
  )
}
