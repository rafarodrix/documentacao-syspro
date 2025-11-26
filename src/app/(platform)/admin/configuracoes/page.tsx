"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form"; // Importe SubmitHandler
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { settingsSchema, type SettingsInput } from "@/lib/schemas";
import { getSettingsAction, updateSettingsAction } from "../_actions/settings-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, DollarSign, ShieldAlert, Headset, Mail, Phone } from "lucide-react";

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();

    const form = useForm<SettingsInput>({
        resolver: zodResolver(settingsSchema) as any,
        defaultValues: {
            minimumWage: 0,
            maintenanceMode: false,
            supportEmail: "",
            supportPhone: "",
        },
        mode: "onChange"
    });

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
                // Reseta com os dados enviados para manter o estado limpo
                form.reset(data);
            } else {
                toast.error(result.error || "Erro ao salvar.");
            }
        });
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl pb-20">

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                    Configurações do Sistema
                </h1>
                <p className="text-muted-foreground text-lg">
                    Defina parâmetros globais que afetam toda a plataforma.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* --- SEÇÃO FINANCEIRA --- */}
                <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>Financeiro</CardTitle>
                                <CardDescription>Parâmetros base para contratos.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="minimumWage">Salário Mínimo (Base)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                                    {/* Dica: O {...register} já cuida do onChange. Removemos configurações manuais desnecessárias */}
                                    <Input
                                        id="minimumWage"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-9 font-medium text-lg"
                                        {...form.register("minimumWage")}
                                    />
                                </div>
                                {form.formState.errors.minimumWage && (
                                    <p className="text-xs text-red-500 font-medium">
                                        {form.formState.errors.minimumWage.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* --- SEÇÃO SUPORTE --- */}
                <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/10">
                                <Headset className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>Canais de Suporte</CardTitle>
                                <CardDescription>Exibidos no rodapé do cliente.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="supportEmail">E-mail</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        id="supportEmail"
                                        placeholder="contato@empresa.com"
                                        className="pl-9"
                                        {...form.register("supportEmail")}
                                    />
                                </div>
                                {form.formState.errors.supportEmail && (
                                    <p className="text-xs text-red-500 font-medium">
                                        {form.formState.errors.supportEmail.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supportPhone">Telefone / WhatsApp</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        id="supportPhone"
                                        placeholder="(11) 99999-9999"
                                        className="pl-9"
                                        {...form.register("supportPhone")}
                                    />
                                </div>
                                {form.formState.errors.supportPhone && (
                                    <p className="text-xs text-red-500 font-medium">
                                        {form.formState.errors.supportPhone.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* --- SEÇÃO PERIGO (Switch) --- */}
                <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm border-l-4 border-l-amber-500/50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/10">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>Zona de Perigo</CardTitle>
                                <CardDescription>Controle de acesso global.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-amber-500/5 border-amber-200/20">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium">Modo de Manutenção</Label>
                                <p className="text-sm text-muted-foreground">
                                    Impede login de clientes. Apenas Admins acessam.
                                </p>
                            </div>
                            <Switch
                                checked={form.watch("maintenanceMode")}
                                onCheckedChange={(checked) =>
                                    form.setValue("maintenanceMode", checked, {
                                        shouldDirty: true,
                                        shouldValidate: true
                                    })
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={isSaving}
                        className="shadow-xl shadow-primary/20 min-w-[150px]"
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
        </div>
    );
}