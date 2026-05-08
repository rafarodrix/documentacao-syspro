import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from "@dosc-syspro/ui";
import { ArrowUpRight, Plus, UserRound, Users } from "lucide-react"

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
    <Card className="w-full border-border/50 flex flex-col">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
            <Link href={viewAllHref}>
              Ver todos
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-60 text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center border border-border">
              <Icon className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground">{emptyDescription}</p>
            </div>
            {createHref && createLabel ? (
              <Button variant="outline" size="sm" className="gap-2 border-dashed h-8" asChild>
                <Link href={createHref}>
                  <Plus className="h-3.5 w-3.5" />
                  {createLabel}
                </Link>
              </Button>
            ) : null}
          </div>
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
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</div>
                  ) : null}
                  {item.meta ? <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{item.meta}</div> : null}
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
      </CardContent>
    </Card>
  )
}
