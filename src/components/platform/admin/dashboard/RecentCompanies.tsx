import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowUpRight } from "lucide-react";

export function RecentCompanies() {
    return (
        <Card className="col-span-3 border-border/50 shadow-sm hover:shadow-md transition-all bg-background/60 backdrop-blur-sm flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Últimas Empresas</CardTitle>
                    <Link href="/admin/empresas">
                        <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                            Ver todas
                        </Badge>
                    </Link>
                </div>
                <CardDescription>Novos cadastros na plataforma.</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md animate-pulse"></div>
                        <div className="relative h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                            <Building2 className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-medium text-foreground">Nenhuma atividade recente</h3>
                        <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                            Novas empresas cadastradas aparecerão aqui automaticamente.
                        </p>
                    </div>

                    <Link href="/admin/empresas">
                        <span className="inline-flex items-center text-xs font-semibold text-primary hover:underline mt-2 group">
                            Gerenciar Cadastros
                            <ArrowUpRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}