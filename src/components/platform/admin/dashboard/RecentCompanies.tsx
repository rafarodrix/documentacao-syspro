import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecentCompanies() {
    return (
        // MUDANÇA: col-span-3 e h-full para esticar junto com o gráfico
        <Card className="col-span-3 lg:col-span-3 border-border/60 shadow-md bg-background/40 backdrop-blur-xl flex flex-col h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">Últimos Cadastros</CardTitle>
                        <CardDescription>Empresas recentes na plataforma.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/empresas">
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex items-center justify-center min-h-[350px]">
                <div className="flex flex-col items-center justify-center text-center space-y-5">

                    {/* Icon Container com efeito Glow */}
                    <div className="relative group cursor-pointer">
                        <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-b from-muted/50 to-muted border border-border flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                            <Building2 className="h-9 w-9 text-muted-foreground/40 group-hover:text-primary/80 transition-colors" />

                            {/* Badge de Notificação (Visual) */}
                            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 max-w-[280px]">
                        <h3 className="font-medium text-foreground text-lg">Nenhuma atividade hoje</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            O painel será atualizado automaticamente assim que novos clientes forem cadastrados.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Link href="/admin/empresas">
                            <Button variant="outline" className="gap-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5">
                                <Plus className="h-4 w-4" />
                                Cadastrar Manualmente
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}