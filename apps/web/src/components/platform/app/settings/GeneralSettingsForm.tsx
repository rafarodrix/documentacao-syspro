"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
    DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
    settingsSchema,
    type SettingsInput,
    type SettingsOutput,
    type SettingsPermissionsAdminView,
} from "@dosc-syspro/contracts/settings";
import { updateSettingsAction } from "@/features/settings/application/actions";
import { getSettingsAction } from "@/features/settings/application/queries";
import { ReasonOptionsEditor } from "@/components/platform/app/settings/ReasonOptionsEditor";
import { AccessControlTab } from "@/components/platform/app/settings/AccessControlTab";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2, Save, DollarSign, ShieldAlert, Headset, Mail, Phone,
    Banknote, Lock, SlidersHorizontal
} from "lucide-react";

const defaultValues: SettingsInput = {
    minimumWage: 0,
    maintenanceMode: false,
    supportEmail: "",
    supportPhone: "",
    rbacMatrixEnabled: true,
    preferences: {
        companyInactivationReasons: DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
        contractBlockReasons: DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
    },
};

interface GeneralSettingsFormProps {
    adminView: SettingsPermissionsAdminView;
}

export default function GeneralSettingsForm({ adminView }: GeneralSettingsFormProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState("general");

    const form = useForm<SettingsInput, undefined, SettingsOutput>({
        resolver: zodResolver(settingsSchema),
        defaultValues,
        mode: "onChange"
    });
    const companyInactivationReasons =
        form.watch("preferences.companyInactivationReasons") ?? DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS;
    const contractBlockReasons =
        form.watch("preferences.contractBlockReasons") ?? DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS;

    // Carregar dados iniciais
    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const result = await getSettingsAction();
                if (!isMounted) return;

                if (result.success) {
                    form.reset(result.data);
                } else {
                    toast.error(result.error);
                }
            } catch (error) {
                toast.error("Erro de conexao ao carregar dados.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        load();
        return () => { isMounted = false; };
    }, [form]);

    const onSubmit: SubmitHandler<SettingsOutput> = async (data) => {
        startTransition(async () => {
            const result = await updateSettingsAction(data);
            if (result.success) {
                toast.success(result.message);
                form.reset(data); // Reseta com os dados novos para limpar estado 'dirty'
            } else {
                toast.error(result.error);
            }
        });
    }

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center border border-dashed rounded-xl bg-muted/10">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">Carregando parametros...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-w-0 overflow-x-hidden animate-in fade-in duration-500">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 space-y-6">
                <TabsList className="inline-flex w-full sm:w-auto p-1 bg-muted/50 border border-border/40">
                    <TabsTrigger value="general" className="px-6 py-2">Geral</TabsTrigger>
                    <TabsTrigger value="preferences" className="px-6 py-2">Motivos de Cancelamento</TabsTrigger>
                    <TabsTrigger value="access" className="px-6 py-2">Perfis de Acesso</TabsTrigger>
                </TabsList>

                <div className={activeTab === 'access' ? 'hidden' : 'block'}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <TabsContent value="general" forceMount className={activeTab !== 'general' ? 'hidden' : 'space-y-6'}>
            {/* --- SECAO FINANCEIRA --- */}
            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Banknote className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Parametros Financeiros</CardTitle>
                            <CardDescription>Defina os valores base para calculo de novos contratos.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="minimumWage">Salario Minimo Nacional (Base)</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                                <Input
                                    id="minimumWage"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-9 font-mono text-lg bg-muted/30 focus:bg-background border-border/60"
                                    {...form.register("minimumWage")}
                                />
                            </div>
                            {form.formState.errors.minimumWage && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    {form.formState.errors.minimumWage.message}
                                </p>
                            )}
                            <p className="text-[11px] text-muted-foreground pt-1">
                                Alterar este valor afetara a simulacao de <strong>novos</strong> contratos. Contratos antigos devem ser reajustados manualmente.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- SECAO SUPORTE --- */}
            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <Headset className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Canais de Atendimento</CardTitle>
                            <CardDescription>Informacoes de contato exibidas no portal do cliente.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="supportEmail">E-mail Oficial</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                    id="supportEmail"
                                    placeholder="suporte@empresa.com"
                                    className="pl-9 bg-muted/30 focus:bg-background border-border/60"
                                    {...form.register("supportEmail")}
                                />
                            </div>
                            {form.formState.errors.supportEmail && (
                                <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.supportEmail.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supportPhone">Telefone / WhatsApp</Label>
                            <div className="relative group">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                    id="supportPhone"
                                    placeholder="(00) 00000-0000"
                                    className="pl-9 bg-muted/30 focus:bg-background border-border/60"
                                    {...form.register("supportPhone")}
                                />
                            </div>
                            {form.formState.errors.supportPhone && (
                                <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.supportPhone.message}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- SECAO SISTEMA / PERIGO --- */}
            <Card className="border-rose-200 dark:border-rose-900/50 shadow-sm bg-rose-50/30 dark:bg-rose-950/10 overflow-hidden">
                <CardHeader className="bg-rose-100/30 dark:bg-rose-900/20 pb-4 border-b border-rose-200 dark:border-rose-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-rose-700 dark:text-rose-400">Controle de Disponibilidade</CardTitle>
                            <CardDescription className="text-rose-600/70 dark:text-rose-400/60">Acoes que afetam o acesso global a plataforma.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="flex flex-row items-center justify-between rounded-lg border border-rose-200 dark:border-rose-900/50 p-4 bg-background/80">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-rose-500" />
                                <Label className="text-base font-medium">Modo de Manutencao</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Se ativado, <strong>bloqueia o login</strong> de todos os clientes. Apenas Admins continuam com acesso.
                            </p>
                        </div>
                        <Switch
                            checked={form.watch("maintenanceMode")}
                            onCheckedChange={(checked) =>
                                form.setValue("maintenanceMode", checked, { shouldDirty: true })
                            }
                            className="data-[state=checked]:bg-rose-600"
                        />
                    </div>
                </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="preferences" forceMount className={activeTab !== 'preferences' ? 'hidden' : 'space-y-6'}>
                <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 pb-4 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 border border-violet-500/20">
                                <SlidersHorizontal className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Motivos de Inativação e Cancelamento</CardTitle>
                                <CardDescription>Gerencie as opções exibidas ao usuário para desativar empresas e cancelar contratos.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 p-5">
                        <ReasonOptionsEditor
                            title="Motivos de inativacao de empresa"
                            description="Usados na inativacao em cascata de empresa."
                            options={companyInactivationReasons}
                            inputPrefix="company-reason"
                            onChange={(next) => {
                                form.setValue("preferences.companyInactivationReasons", next, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                });
                            }}
                        />

                        <ReasonOptionsEditor
                            title="Motivos de bloqueio contratual"
                            description="Usados ao suspender contrato e refletir no restante do portal."
                            options={contractBlockReasons}
                            inputPrefix="contract-reason"
                            onChange={(next) => {
                                form.setValue("preferences.contractBlockReasons", next, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                });
                            }}
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            <div className="flex justify-end pt-4 pb-10">
                <Button
                    type="submit"
                    size="lg"
                    disabled={isSaving || !form.formState.isDirty}
                    className="shadow-xl shadow-primary/20 min-w-40 transition-all hover:scale-[1.02]"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Salvar Alteracoes
                        </>
                    )}
                </Button>
            </div>
          </form>
        </div>

        <TabsContent value="access" forceMount className={activeTab !== 'access' ? 'hidden' : ''}>
            <AccessControlTab adminView={adminView} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
