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
import {
  SettingsTabsRail,
  SettingsTabsRailTrigger,
} from "@/app/(platform)/portal/configuracoes/settings-shell";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Save, DollarSign, ShieldAlert, Headset, Mail, Phone,
  Banknote, Lock, SlidersHorizontal, Settings
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
  adminView: SettingsPermissionsAdminView | null;
}

export default function GeneralSettingsForm({ adminView }: GeneralSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();

  const form = useForm<SettingsInput, undefined, SettingsOutput>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
    mode: "onChange"
  });

  const companyInactivationReasons =
    form.watch("preferences.companyInactivationReasons") ?? DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS;
  const contractBlockReasons =
    form.watch("preferences.contractBlockReasons") ?? DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS;

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
      } catch {
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
        form.reset(data);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando parametros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden animate-in fade-in duration-500">
      <Tabs defaultValue="general" className="space-y-5">
        <SettingsTabsRail className={adminView ? "sm:grid-cols-2" : "sm:grid-cols-1"}>
          <SettingsTabsRailTrigger
            value="general"
            icon={Settings}
            title="Geral"
          />
          {adminView ? (
            <SettingsTabsRailTrigger
              value="access"
              icon={SlidersHorizontal}
              title="Perfis de acesso"
            />
          ) : null}
        </SettingsTabsRail>

        <TabsContent value="general" className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="overflow-hidden border-border/60 bg-background/50 shadow-sm backdrop-blur-sm">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-600">
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
                    <div className="group relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-emerald-600" />
                      <Input
                        id="minimumWage"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-muted/30 pl-9 font-mono text-lg focus:bg-background border-border/60"
                        {...form.register("minimumWage")}
                      />
                    </div>
                    {form.formState.errors.minimumWage && (
                      <p className="ml-1 text-xs font-medium text-red-500">
                        {form.formState.errors.minimumWage.message}
                      </p>
                    )}
                    <p className="pt-1 text-[11px] text-muted-foreground">
                      Alterar este valor afetara a simulacao de <strong>novos</strong> contratos. Contratos antigos devem ser reajustados manualmente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/60 bg-background/50 shadow-sm backdrop-blur-sm">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-600">
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
                    <div className="group relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-600" />
                      <Input
                        id="supportEmail"
                        placeholder="suporte@empresa.com"
                        className="bg-muted/30 pl-9 focus:bg-background border-border/60"
                        {...form.register("supportEmail")}
                      />
                    </div>
                    {form.formState.errors.supportEmail && (
                      <p className="ml-1 text-xs font-medium text-red-500">{form.formState.errors.supportEmail.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportPhone">Telefone / WhatsApp</Label>
                    <div className="group relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-600" />
                      <Input
                        id="supportPhone"
                        placeholder="(00) 00000-0000"
                        className="bg-muted/30 pl-9 focus:bg-background border-border/60"
                        {...form.register("supportPhone")}
                      />
                    </div>
                    {form.formState.errors.supportPhone && (
                      <p className="ml-1 text-xs font-medium text-red-500">{form.formState.errors.supportPhone.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-rose-200 bg-rose-50/30 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/10">
              <CardHeader className="border-b border-rose-200 bg-rose-100/30 pb-4 dark:border-rose-900/50 dark:bg-rose-900/20">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-rose-700 dark:text-rose-400">Controle de Disponibilidade</CardTitle>
                    <CardDescription className="text-rose-600/70 dark:text-rose-400/60">Acoes que afetam o acesso global a plataforma.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-row items-center justify-between rounded-lg border border-rose-200 bg-background/80 p-4 dark:border-rose-900/50">
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

            <Card className="overflow-hidden border-border/60 bg-background/50 shadow-sm backdrop-blur-sm">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-2 text-violet-600">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Motivos de Inativacao e Cancelamento</CardTitle>
                    <CardDescription>Gerencie as opcoes exibidas ao usuario para desativar empresas e cancelar contratos.</CardDescription>
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

            <div className="flex justify-end pt-4 pb-10">
              <Button
                type="submit"
                size="lg"
                disabled={isSaving || !form.formState.isDirty}
                className="min-w-40 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
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
        </TabsContent>

        {adminView ? (
          <TabsContent value="access" className="space-y-4">
            <AccessControlTab adminView={adminView} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
