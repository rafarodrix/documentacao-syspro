import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getContractsAction } from "@/actions/admin/contract-actions";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ShieldCheck, Sliders, Landmark, FileText } from "lucide-react";

import GeneralSettingsForm from "@/components/platform/app/settings/GeneralSettingsForm";
import { AccessControlTab } from "@/components/platform/app/settings/AccessControlTab";
import { SyncTaxButton } from "@/components/platform/tax/SyncTaxButton";
import { TaxClassificationList } from "@/components/platform/tax/TaxClassificationList";
import { BulkReadjustDialog } from "@/components/platform/app/contratos/BulkReadjustDialog";
import { ContractSheet } from "@/components/platform/app/contratos/ContractSheet";
import { ContractStats } from "@/components/platform/app/contratos/ContractStats";
import { ContractsTable } from "@/components/platform/app/contratos/ContractsTable";

interface SettingsPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const TAB_VALUES = new Set(["general", "access", "tax", "contracts"]);

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const session = await requireSession();
    if (session.role !== Role.ADMIN) {
        redirect("/app");
    }

    const params = searchParams ? await searchParams : undefined;
    const rawTab = typeof params?.tab === "string" ? params.tab : "general";
    const defaultTab = TAB_VALUES.has(rawTab) ? rawTab : "general";

    const [contractsRes, companies] = await Promise.all([
        getContractsAction(),
        prisma.company.findMany({
            where: { deletedAt: null },
            orderBy: { razaoSocial: "asc" },
            select: { id: true, razaoSocial: true },
        }),
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Sliders className="h-8 w-8 text-primary/80" />
                    Configuracoes
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Gerencie parametros globais, contratos ativos e regras de acesso do sistema.
                </p>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-6">
                <div className="flex items-center">
                    <TabsList className="bg-muted/50 p-1 border border-border/40 h-auto flex-wrap">
                        <TabsTrigger
                            value="general"
                            className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">Geral & Financeiro</span>
                        </TabsTrigger>

                        <TabsTrigger
                            value="contracts"
                            className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Contratos</span>
                        </TabsTrigger>

                        <TabsTrigger
                            value="access"
                            className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-medium">Perfis de Acesso</span>
                        </TabsTrigger>

                        <TabsTrigger
                            value="tax"
                            className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
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

                <TabsContent value="contracts" className="space-y-6 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-medium">Contratos</h3>
                            <p className="text-sm text-muted-foreground">
                                Inativar o ultimo contrato ativo bloqueia empresa e usuarios cliente vinculados.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <BulkReadjustDialog />
                            <ContractSheet companies={companies} />
                        </div>
                    </div>

                    <ContractStats contracts={contracts} />
                    <ContractsTable contracts={contracts} />
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
