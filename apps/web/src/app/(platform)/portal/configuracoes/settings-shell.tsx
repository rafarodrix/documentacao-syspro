import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function SettingsPageIntro({
  icon: Icon,
  eyebrow,
  title,
  description,
  aside,
  titleAs = "h2",
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
  titleAs?: "h1" | "h2";
}) {
  const TitleTag = titleAs;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between md:p-8">
        <div className="min-w-0 space-y-3">
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
              {eyebrow}
            </span>
          ) : null}
          <div className="space-y-2">
            <TitleTag className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              {title}
            </TitleTag>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              {description}
            </p>
          </div>
        </div>
        {aside ? <div className="min-w-0 md:max-w-sm">{aside}</div> : null}
      </div>
    </div>
  );
}

export function SettingsTabsRail({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        "grid h-auto w-full grid-cols-1 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2 sm:w-fit sm:grid-cols-2 xl:grid-cols-none xl:auto-cols-fr xl:grid-flow-col",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsTabsRailTrigger({
  icon: Icon,
  title,
  description,
  className,
  children,
  ...props
}: ComponentProps<typeof TabsTrigger> & {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <TabsTrigger
      className={cn(
        "h-auto min-h-16 justify-start rounded-xl border border-transparent px-4 py-3 text-left data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    >
      <span className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          {description ? (
            <span className="mt-1 block whitespace-normal text-xs leading-5 text-muted-foreground">
              {description}
            </span>
          ) : null}
          {children}
        </span>
      </span>
    </TabsTrigger>
  );
}

export function SettingsMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardContent className="space-y-2 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <div className="text-sm font-semibold text-foreground">{value}</div>
        {helper ? <div className="text-xs leading-5 text-muted-foreground">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}
