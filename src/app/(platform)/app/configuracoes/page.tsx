import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getContractsAction } from "@/features/contracts/application/actions";
import { getSefazRoutesAction } from "@/features/settings/application/actions";
import { SETTING_KEYS } from "@/core/application/schema/settings-schema";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ShieldCheck, Sliders, Landmark, FileText, Activity, Files, Wallet, Boxes } from "lucide-react";

import { AccessControlTab, GeneralSettingsForm, SefazRoutesTab, ZammadObservabilityTab } from "@/features/settings/interface";
import {
    SyncTaxAnexosButton,
    SyncTaxClassTribButton,
    SyncTaxCredPresumidoButton,
    SyncTaxNcmButton,
    TaxAnexosContainer,
    TaxClassificationList,
    TaxCredPresumidoContainer,
    TaxNcmContainer,
    TaxSyncStatusBar,
} from "@/features/tax/interface";
import { BulkReadjustDialog, ContractSheet, ContractStats, ContractsTable } from "@/features/contracts/interface";

interface SettingsPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const TAB_VALUES = new Set(["general", "access", "tax", "contracts", "sefaz", "observability"]);

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const session = await requireSession();
    if (session.role !== Role.ADMIN) {
        redirect("/app");
    }

    const params = searchParams ? await searchParams : undefined;
    const rawTab = typeof params?.tab === "string" ? params.tab : "general";
    const defaultTab = TAB_VALUES.has(rawTab) ? rawTab : "general";
    const mode = typeof params?.mode === "string" ? params.mode : "";
    const isContractsCreateMode = mode === "create";

    const [contractsRes, companies, rbacSetting, sefazRoutesRes] = await Promise.all([
        getContractsAction(),
        prisma.company.findMany({
            where: { deletedAt: null },
            orderBy: { razaoSocial: "asc" },
            select: { id: true, razaoSocial: true, cnpj: true },
        }),
        prisma.systemSetting.findUnique({
            where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
            select: { value: true },
        }),
        getSefazRoutesAction(),
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];
    const rbacMatrixEnabled = rbacSetting?.value !== "false";
    const sefazRoutes = sefazRoutesRes.success ? sefazRoutesRes.data : [];

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
                        <TabsTrigger value="general" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-colors">
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">Geral & Financeiro</span>
                        </TabsTrigger>

                        <TabsTrigger value="contracts" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-colors">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Contratos</span>
                        </TabsTrigger>

                        <TabsTrigger value="access" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-colors">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-medium">Perfis de Acesso</span>
                        </TabsTrigger>

                        <TabsTrigger value="tax" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-colors">
                            <Landmark className="h-4 w-4" />
                            <span className="font-medium">Fiscal & Tributario</span>
                        </TabsTrigger>

                        <TabsTrigger value="sefaz" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-colors">
                            <Activity className="h-4 w-4" />
                            <span className="font-medium">Rotas SEFAZ</span>
                        </TabsTrigger>

                        <TabsTrigger value="observability" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-colors">
                            <Activity className="h-4 w-4" />
                            <span className="font-medium">Observabilidade</span>
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
                            <p className="text-sm text-muted-foreground">Inativar o ultimo contrato ativo bloqueia empresa e usuarios cliente vinculados.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {!isContractsCreateMode && (
                                <>
                                    <BulkReadjustDialog />
                                    <ContractSheet companies={companies} mode="button" />
                                </>
                            )}
                        </div>
                    </div>

                    {isContractsCreateMode ? (
                        <ContractSheet companies={companies} mode="full" />
                    ) : (
                        <>
                            <ContractStats contracts={contracts} />
                            <ContractsTable contracts={contracts} />
                        </>
                    )}
                </TabsContent>

                <TabsContent value="access" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-5xl">
                        <AccessControlTab initialEnabled={rbacMatrixEnabled} />
                    </div>
                </TabsContent>

                <TabsContent value="tax" className="space-y-4 focus-visible:ring-0 outline-none">
                    <div className="max-w-6xl">
                        <h3 className="mb-4 text-lg font-medium">Sincronizacao de Tabelas Fiscais</h3>
                        <TaxSyncStatusBar />

                        <Tabs defaultValue="class-trib" className="space-y-4">
                            <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
                                <TabsTrigger value="class-trib" className="gap-2 px-4 py-2">
                                    <Landmark className="h-4 w-4" />
                                    Rota classTrib
                                </TabsTrigger>
                                <TabsTrigger value="anexos" className="gap-2 px-4 py-2">
                                    <Files className="h-4 w-4" />
                                    Rota anexos
                                </TabsTrigger>
                                <TabsTrigger value="cred-presumido" className="gap-2 px-4 py-2">
                                    <Wallet className="h-4 w-4" />
                                    Rota credPresumido
                                </TabsTrigger>
                                <TabsTrigger value="ncm" className="gap-2 px-4 py-2">
                                    <Boxes className="h-4 w-4" />
                                    Rota NCM
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="class-trib" className="space-y-4">
                                <SyncTaxClassTribButton />
                                <div className="mt-6">
                                    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando classTrib...</div>}>
                                        <TaxClassificationList />
                                    </Suspense>
                                </div>
                            </TabsContent>

                            <TabsContent value="anexos" className="space-y-4">
                                <SyncTaxAnexosButton />
                                <div className="mt-6">
                                    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando anexos...</div>}>
                                        <TaxAnexosContainer />
                                    </Suspense>
                                </div>
                            </TabsContent>

                            <TabsContent value="cred-presumido" className="space-y-4">
                                <SyncTaxCredPresumidoButton />
                                <div className="mt-6">
                                    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando credito presumido...</div>}>
                                        <TaxCredPresumidoContainer />
                                    </Suspense>
                                </div>
                            </TabsContent>

                            <TabsContent value="ncm" className="space-y-4">
                                <SyncTaxNcmButton />
                                <div className="mt-6">
                                    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando NCM...</div>}>
                                        <TaxNcmContainer />
                                    </Suspense>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </TabsContent>

                <TabsContent value="sefaz" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-6xl">
                        <SefazRoutesTab initialRoutes={sefazRoutes} />
                    </div>
                </TabsContent>

                <TabsContent value="observability" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-6xl">
                        <ZammadObservabilityTab />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
