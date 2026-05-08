import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { Building2, Minus, TrendingDown, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardStatsProps {
  companiesCount: number;
  companiesGrowth: number;
  usersCount: number;
  activeUsersCount: number;
}

function GrowthIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        Estavel este mes
      </span>
    );
  }

  const positive = value > 0;

  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-500" : "text-red-500")}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value} este mes
    </span>
  );
}

export function DashboardStats({
  companiesCount,
  companiesGrowth,
  usersCount,
  activeUsersCount,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="relative overflow-hidden border-border/50 transition-all hover:border-border/80 hover:shadow-sm">
        <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
          <Building2 className="h-20 w-20 -rotate-12 text-blue-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Empresas Ativas
          </CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-3xl font-bold tracking-tight tabular-nums">{companiesCount.toLocaleString("pt-BR")}</div>
          <div className="mt-1">
            <GrowthIndicator value={companiesGrowth} />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-border/50 transition-all hover:border-border/80 hover:shadow-sm">
        <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
          <Users className="h-20 w-20 rotate-12 text-violet-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuarios</CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10">
            <Users className="h-3.5 w-3.5 text-violet-500" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-3xl font-bold tracking-tight tabular-nums">{usersCount.toLocaleString("pt-BR")}</div>
          <div className="mt-1">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-500">{activeUsersCount}</span> ativos
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
