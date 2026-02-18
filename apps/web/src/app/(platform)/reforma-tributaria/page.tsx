import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TaxViewerContainer } from "@/components/platform/tax/TaxViewerContainer";
import { BookOpen, Scale, Info, CalendarDays } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Separator } from "@/components/ui/separator";

export const metadata = {
    title: "Tabelas IBS/CBS | Reforma Tributaria",
    description: "Consulta de CSTs e Classificacoes Fiscais oficiais.",
};

export default async function ReformaTributariaPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;

    // Guard: Precisa de permissao para ver reforma tributaria
    if (!hasPermission(role, "tax_reform:view")) {
        redirect("/");
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Scale className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Reforma Tributaria (IBS/CBS)
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Consulta oficial de CSTs e aliquotas para o novo modelo tributario.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            <Alert className="bg-blue-50/50 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-200">
                <Info className="h-4 w-4" />
                <AlertTitle className="font-semibold">Base de Dados Sincronizada</AlertTitle>
                <AlertDescription className="text-sm mt-1">
                    Estas regras sao importadas diretamente da base da SEFAZ. Se voce nao encontrar um codigo especifico,
                    solicite ao administrador para realizar uma nova sincronizacao nas configuracoes do sistema.
                </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        Regras Vigentes
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        <CalendarDays className="h-3 w-3" />
                        <span>Vigencia: 2026+</span>
                    </div>
                </div>

                <div className="mt-2">
                    <Suspense
                        fallback={
                            <div className="w-full h-[600px] rounded-md border bg-card p-4 space-y-4">
                                <div className="h-10 bg-muted/40 rounded-md w-full animate-pulse" />
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="h-16 bg-muted/20 rounded-md w-full animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        }
                    >
                        <TaxViewerContainer />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
