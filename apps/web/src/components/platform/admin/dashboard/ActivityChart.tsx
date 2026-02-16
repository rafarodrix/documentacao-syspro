import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActivityChart() {
    return (
        <Card className="col-span-4 lg:col-span-4 border-border/60 shadow-md bg-background/40 backdrop-blur-xl flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Atividade do Sistema</CardTitle>
                    <CardDescription>Requisições e tráfego (Últimos 7 dias)</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 pr-2.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Tempo Real
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pl-2 flex-1">
                <div className="h-[450px] w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/5 relative overflow-hidden group mx-2">

                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                    <div className="flex flex-col items-center gap-4 z-10 opacity-50 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-105">
                        <div className="p-4 rounded-full bg-gradient-to-b from-background to-muted border border-border shadow-lg">
                            <BarChart3 className="h-8 w-8 text-primary/60" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                Visualização de Dados
                            </p>
                            <p className="text-xs text-muted-foreground max-w-[200px]">
                                Gráfico aguardando conexão com API de Analytics.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}