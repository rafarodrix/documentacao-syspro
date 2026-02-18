import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ShieldCheck, Sliders, Landmark } from "lucide-react";

import GeneralSettingsForm from "@/components/platform/admin/settings/GeneralSettingsForm";
import { AccessControlTab } from "@/components/platform/admin/settings/AccessControlTab";
import { SyncTaxButton } from "@/components/platform/tax/SyncTaxButton";
import { TaxClassificationList } from "@/components/platform/tax/TaxClassificationList";

export default async function ConfiguracoesPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;

    // Guard: Apenas quem tem permissao de ver configuracoes
    if (!hasPermission(role, "settings:view")) {
        redirect("/");
    }

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Sliders className="h-8 w-8 text-primary/80" />
                    Configuracoes
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Gerencie parametros globais do sistema, regras financeiras e perfis de acesso.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <div className="flex items-center">
                    <TabsList className="bg-muted/50 p-1 border border-border/40 h-auto">
                        <TabsTrigger value="general" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">Geral & Financeiro</span>
                        </TabsTrigger>
                        <TabsTrigger value="access" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-medium">Perfis de Acesso</span>
                        </TabsTrigger>
                        <TabsTrigger value="tax" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <Landmark className="h-4 w-4" />
                            <span className="font-medium">Fiscal & Tributario</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="general" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-4xl">
                        <GeneralSettingsForm />
                    </div>
                </TabsContent>

                <TabsContent value="access" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-5xl">
                        <AccessControlTab />
                    </div>
                </TabsContent>

                <TabsContent value="tax" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-5xl">
                        <h3 className="text-lg font-medium mb-4">Sincronizacao de Tabelas</h3>
                        <SyncTaxButton />
                        <div className="mt-8">
                            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando dados fiscais...</div>}>
                                <TaxClassificationList />
                            </Suspense>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
