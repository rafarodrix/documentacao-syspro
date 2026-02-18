"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { settingsSchema, type SettingsInput } from "@/core/application/schema/settings-schema";
import { getSettingsAction, updateSettingsAction } from "@/actions/admin/settings-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Loader2, Save, DollarSign, ShieldAlert, Headset, Mail, Phone,
    Banknote, Lock
} from "lucide-react";

export default function GeneralSettingsForm() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();

    const form = useForm<SettingsInput>({
        resolver: zodResolver(settingsSchema) as any,
        defaultValues: {
            minimumWage: 0,
            maintenanceMode: false,
            supportEmail: "",
            supportPhone: "",
        } as any,
        mode: "onChange"
    });

    // Carregar dados iniciais
    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const result = await getSettingsAction();
                if (isMounted && result.success && result.data) {
                    form.reset(result.data);
                } else if (result.error) {
                    toast.error(result.error);
                }
            } catch (error) {
                toast.error("Erro de conexão ao carregar dados.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        load();
        return () => { isMounted = false; };
    }, [form]);

    const onSubmit: SubmitHandler<SettingsInput> = async (data) => {
        startTransition(async () => {
            const result = await updateSettingsAction(data);
            if (result.success) {
                toast.success(result.message);
                form.reset(data); // Reseta com os dados novos para limpar estado 'dirty'
            } else {
                toast.error(result.error || "Erro ao salvar.");
            }
        });
    }

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center border border-dashed rounded-xl bg-muted/10">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">Carregando parâmetros...</p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in duration-500">

            {/* --- SEÇÃO FINANCEIRA --- */}
            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Banknote className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Parâmetros Financeiros</CardTitle>
                            <CardDescription>Defina os valores base para cálculo de novos contratos.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <Separator className="bg-border/40" />
                <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="minimumWage">Salário Mínimo Nacional (Base)</Label>
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
                                Alterar este valor afetará a simulação de <strong>novos</strong> contratos. Contratos antigos devem ser reajustados manualmente.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- SEÇÃO SUPORTE --- */}
            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <Headset className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Canais de Atendimento</CardTitle>
                            <CardDescription>Informações de contato exibidas no portal do cliente.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <Separator className="bg-border/40" />
                <CardContent className="pt-6">
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

            {/* --- SEÇÃO SISTEMA / PERIGO --- */}
            <Card className="border-rose-200 dark:border-rose-900/50 shadow-sm bg-rose-50/30 dark:bg-rose-950/10">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-rose-700 dark:text-rose-400">Controle de Disponibilidade</CardTitle>
                            <CardDescription className="text-rose-600/70 dark:text-rose-400/60">Ações que afetam o acesso global à plataforma.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="flex flex-row items-center justify-between rounded-lg border border-rose-200 dark:border-rose-900/50 p-4 bg-background/50">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-rose-500" />
                                <Label className="text-base font-medium">Modo de Manutenção</Label>
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

            <div className="flex justify-end pt-4 pb-10">
                <Button
                    type="submit"
                    size="lg"
                    disabled={isSaving || !form.formState.isDirty}
                    className="shadow-xl shadow-primary/20 min-w-[160px] transition-all hover:scale-[1.02]"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                        </>
                    )}
                </Button>
            </div>

        </form>
    );
}