import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3 } from "lucide-react";

export function ActivityChart() {
    return (
        <Card className="col-span-4 border-border/50 shadow-sm hover:shadow-md transition-all bg-background/60 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Atividade do Sistema</CardTitle>
                        <CardDescription>Tráfego e requisições nos últimos 7 dias.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        <Activity className="mr-1 h-3 w-3" /> Tempo Real
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 m-1 relative overflow-hidden group">
                    {/* Fundo animado sutil */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

                    <div className="flex flex-col items-center gap-3 z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="p-3 rounded-full bg-background border border-border shadow-sm">
                            <BarChart3 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            Gráfico de desempenho indisponível no momento
                        </p>
                        <p className="text-xs text-muted-foreground/60 max-w-[250px] text-center">
                            Conecte uma ferramenta de analytics como Vercel Analytics ou PostHog.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}