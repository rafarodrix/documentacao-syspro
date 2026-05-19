"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BellRing,
  Globe2,
  Loader2,
  MessageSquareText,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_AUTOMATION_MODULE_SETTINGS,
  automationModuleSettingsSchema,
  type AutomationModuleSettings,
  type WhatsAppAutomationBinding,
} from "@dosc-syspro/contracts/automation";
import {
  SettingsPageIntro,
  SettingsTabsRail,
  SettingsTabsRailTrigger,
} from "@/app/(platform)/portal/configuracoes/settings-shell";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Switch, Tabs, TabsContent, Textarea, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@dosc-syspro/ui";

function createBindingId() {
  return `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function inferBindingAudience(jid?: string) {
  const normalized = String(jid ?? "").trim().toLowerCase();
  if (normalized.endsWith("@newsletter")) {
    return {
      label: "Canal publico",
      description: "Use para comunicacoes amplas como releases, avisos e novidades.",
    };
  }

  return {
    label: "Grupo interno",
    description: "Use para fluxo operacional de tickets entre suporte, desenvolvimento e testes.",
  };
}

function createWhatsAppBinding(): WhatsAppAutomationBinding {
  return {
    id: createBindingId(),
    label: "",
    jid: "",
    active: true,
    automations: {
      ticketCreatedSupport: false,
      ticketCreatedDevelopment: false,
      ticketTeamTransferFromSupport: false,
      ticketTeamTransferToSupport: false,
      ticketTeamTransferFromDevelopment: false,
      ticketTeamTransferToDevelopment: false,
      ticketStatusTesting: false,
      ticketStatusTestingFailed: false,
      releasePublished: false,
      sefazRouteDown: false,
      sefazRouteRecovered: false,
      monthlyRoutineOverdue: false,
    },
  };
}

const INTERNAL_WHATSAPP_AUTOMATION_FIELDS = [
  {
    key: "ticketCreatedSupport",
    label: "Abertura em Suporte",
    description: "Dispara quando o ticket nasce em Suporte.",
  },
  {
    key: "ticketCreatedDevelopment",
    label: "Abertura em Desenvolvimento",
    description: "Dispara quando o ticket nasce em Desenvolvimento.",
  },
  {
    key: "ticketTeamTransferFromSupport",
    label: "Saiu de Suporte",
    description: "Dispara quando o ticket deixa o setor de Suporte.",
  },
  {
    key: "ticketTeamTransferToSupport",
    label: "Entrou em Suporte",
    description: "Dispara quando o ticket entra no setor de Suporte.",
  },
  {
    key: "ticketTeamTransferFromDevelopment",
    label: "Saiu de Desenvolvimento",
    description: "Dispara quando o ticket deixa o setor de Desenvolvimento.",
  },
  {
    key: "ticketTeamTransferToDevelopment",
    label: "Entrou em Desenvolvimento",
    description: "Dispara quando o ticket entra no setor de Desenvolvimento.",
  },
  {
    key: "ticketStatusTesting",
    label: "Mudou para Em testes",
    description: "Dispara quando o ticket entra em Em testes.",
  },
  {
    key: "ticketStatusTestingFailed",
    label: "Retorno dos testes",
    description: "Dispara quando o ticket volta de Em testes.",
  },
] as const;

const PUBLIC_CHANNEL_AUTOMATION_FIELDS = [
  {
    key: "releasePublished",
    label: "Release publicada",
    description: "Dispara quando um ticket resolvido entra na listagem de releases.",
  },
  {
    key: "sefazRouteDown",
    label: "SEFAZ indisponivel",
    description: "Dispara quando uma rota SEFAZ entra em falha e abre uma janela de indisponibilidade.",
  },
  {
    key: "sefazRouteRecovered",
    label: "SEFAZ normalizada",
    description: "Dispara quando uma rota SEFAZ volta ao normal e encerra a janela de indisponibilidade.",
  },
] as const;

const MONTHLY_ROUTINE_AUTOMATION_FIELDS = [
  {
    key: "monthlyRoutineOverdue",
    label: "Rotina voltou para atrasado",
    description: "Dispara quando a competencia volta para Atrasado apos exceder o tempo limite em aguardando cliente.",
  },
] as const;

type AutomationSettingsFormInput = z.input<typeof automationModuleSettingsSchema>;
type AutomationSettingsFormOutput = z.output<typeof automationModuleSettingsSchema>;

export function AutomationSettingsTab() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<AutomationSettingsFormInput, unknown, AutomationSettingsFormOutput>({
    resolver: zodResolver(automationModuleSettingsSchema),
    defaultValues: DEFAULT_AUTOMATION_MODULE_SETTINGS,
  });

  const bindingsArray = useFieldArray({
    control: form.control,
    name: "whatsapp.bindings",
  });

  const autoResponseEnabled = form.watch("autoResponseEnabled");
  const waitingCustomerTimeoutEnabled = form.watch("monthlyRoutines.waitingCustomerTimeoutEnabled");

  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/automations", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          success?: boolean;
          data?: AutomationModuleSettings;
        };

        if (!active) return;
        if (json.success && json.data) {
          form.reset(json.data);
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar configuracoes de automacoes:", error);
        toast.error("Nao foi possivel carregar as configuracoes de automacoes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form]);

  function onSubmit(data: AutomationModuleSettings) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/platform/settings/automations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = (await response.json()) as {
          success?: boolean;
          message?: string;
          error?: string;
        };

        if (!result.success) {
          toast.error(result.error || "Erro ao salvar configuracoes.");
          return;
        }

        toast.success(result.message || "Configuracoes de automacoes salvas.");
        form.reset(data);
      } catch (error) {
        console.error("Erro ao salvar configuracoes de automacoes:", error);
        toast.error("Processo falhou.");
      }
    });
  }

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="space-y-4 p-5">
          <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-28 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-40 animate-pulse rounded-lg bg-muted/70" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 animate-in fade-in duration-500">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-24">
          <SettingsPageIntro
            icon={MessageSquareText}
            eyebrow="Fluxos"
            title="Automacoes"
            description="Gerencie regras automaticas e vinculos de grupos do WhatsApp sem acoplar a configuracao ao provider atual."
          />

          <Tabs defaultValue="whatsapp" className="w-full">
            <SettingsTabsRail className="sm:grid-cols-1">
              <SettingsTabsRailTrigger
                value="whatsapp"
                icon={MessageSquareText}
                title="WhatsApp"
              />
            </SettingsTabsRail>

            <TabsContent value="whatsapp" className="mt-5 space-y-5">
              <Card className="border-border/60 bg-card/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Settings2 className="h-4 w-4 text-primary/70" />
                    Regras gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="autoAssignToCreator"
                    render={({ field }) => (
                      <ToggleSettingCard
                        label="Auto-atribuir internos"
                        description="Operador vira responsavel ao abrir chamado pelo portal."
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoResponseEnabled"
                    render={({ field }) => (
                      <ToggleSettingCard
                        label="Auto resposta"
                        description="Mensagem enviada na abertura do ticket para o cliente."
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requireTestingReturnReason"
                    render={({ field }) => (
                      <ToggleSettingCard
                        label="Motivo obrigatorio no retorno dos testes"
                        description="Exige justificativa ao voltar de Em teste para Em andamento."
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  {autoResponseEnabled && (
                    <FormField
                      control={form.control}
                      name="autoResponseMessage"
                      render={({ field }) => (
                        <FormItem className="rounded-xl border border-border/60 bg-background/60 p-4">
                          <FormLabel>Mensagem automatica</FormLabel>
                          <FormDescription className="text-xs">
                            Texto enviado automaticamente quando a resposta inicial estiver ativa.
                          </FormDescription>
                          <FormControl>
                            <Textarea rows={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BellRing className="h-4 w-4 text-primary/70" />
                    Tarefas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="monthlyRoutines.waitingCustomerTimeoutEnabled"
                    render={({ field }) => (
                      <ToggleSettingCard
                        label="Voltar para atrasado por tempo em aguardando cliente"
                        description="Reavalia a competencia quando ela ficar parada aguardando o cliente por tempo demais."
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyRoutines.waitingCustomerTimeoutHours"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border/60 bg-background/60 p-4">
                        <FormLabel>Janela de recidiva (horas)</FormLabel>
                        <FormDescription className="text-xs">
                          Depois desse prazo, a rotina em aguardando cliente volta para atrasado.
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={240}
                            disabled={!waitingCustomerTimeoutEnabled}
                            value={String(field.value ?? 36)}
                            onChange={(event) => field.onChange(Number(event.target.value || 36))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/95">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BellRing className="h-4 w-4 text-primary/70" />
                        Vinculos de grupos e canais
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Cada vinculo representa um grupo ou canal real do WhatsApp. Habilite so as
                        automacoes que aquele destino deve receber.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => bindingsArray.append(createWhatsAppBinding())}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Vinculo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bindingsArray.fields.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                      Nenhum vinculo cadastrado. Crie um grupo ou canal e habilite as automacoes
                      desejadas.
                    </div>
                  )}

                  {bindingsArray.fields.map((fieldItem, index) => {
                    const audience = inferBindingAudience(form.watch(`whatsapp.bindings.${index}.jid`));

                    return (
                      <div
                        key={fieldItem.id}
                        className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4 md:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/50 px-3 py-3 text-[11px] text-muted-foreground">
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              Perfil do vinculo
                            </div>
                            <div className="mt-1">
                              <span className="font-medium text-foreground">{audience.label}</span>
                              {" · "}
                              {audience.description}
                            </div>
                          </div>
                          <div className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Vinculo {index + 1}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_2.5rem]">
                          <FormField
                            control={form.control}
                            name={`whatsapp.bindings.${index}.label`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do vinculo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Grupo Suporte N1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`whatsapp.bindings.${index}.jid`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>JID do grupo/canal</FormLabel>
                                <FormControl>
                                  <Input placeholder="1203630...@g.us ou 1203630...@newsletter" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`whatsapp.bindings.${index}.active`}
                            render={({ field }) => (
                              <ToggleSettingCard
                                label="Ativo"
                                description="Liga ou desliga o vinculo."
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                compact
                              />
                            )}
                          />

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              onClick={() => bindingsArray.remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <SettingsGroupLabel
                                icon={BellRing}
                                title="Automacoes de tickets"
                                description="Eventos operacionais do modulo de tickets para grupos internos."
                              />
                            <div className="grid gap-3 md:grid-cols-2">
                              {INTERNAL_WHATSAPP_AUTOMATION_FIELDS.map((automation) => (
                                <FormField
                                  key={automation.key}
                                  control={form.control}
                                  name={`whatsapp.bindings.${index}.automations.${automation.key}`}
                                  render={({ field }) => (
                                    <ToggleSettingCard
                                      label={automation.label}
                                      description={automation.description}
                                      checked={field.value ?? false}
                                      onCheckedChange={field.onChange}
                                    />
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                            <div className="space-y-2">
                              <SettingsGroupLabel
                                icon={Globe2}
                              title="Automacoes publicas de canal"
                              description="Eventos de ampla divulgacao para canais abertos."
                            />
                            <div className="grid gap-3 md:grid-cols-2">
                              {PUBLIC_CHANNEL_AUTOMATION_FIELDS.map((automation) => (
                                <FormField
                                  key={automation.key}
                                  control={form.control}
                                  name={`whatsapp.bindings.${index}.automations.${automation.key}`}
                                  render={({ field }) => (
                                    <ToggleSettingCard
                                      label={automation.label}
                                      description={automation.description}
                                      checked={field.value ?? false}
                                      onCheckedChange={field.onChange}
                                      tone="sky"
                                    />
                                  )}
                                />
                              ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <SettingsGroupLabel
                                icon={BellRing}
                                title="Automacoes de tarefas"
                                description="Eventos operacionais recorrentes da fila de tarefas."
                              />
                              <div className="grid gap-3 md:grid-cols-2">
                                {MONTHLY_ROUTINE_AUTOMATION_FIELDS.map((automation) => (
                                  <FormField
                                    key={automation.key}
                                    control={form.control}
                                    name={`whatsapp.bindings.${index}.automations.${automation.key}`}
                                    render={({ field }) => (
                                      <ToggleSettingCard
                                        label={automation.label}
                                        description={automation.description}
                                        checked={field.value ?? false}
                                        onCheckedChange={field.onChange}
                                        tone="sky"
                                      />
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-2">
            <div className="rounded-xl border border-border/60 bg-background/95 p-2 shadow-lg">
              <Button type="submit" disabled={isPending} className="h-10 gap-2">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isPending ? "Salvando" : "Salvar automacoes"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

function ToggleSettingCard({
  label,
  description,
  checked,
  onCheckedChange,
  compact = false,
  tone = "default",
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  compact?: boolean;
  tone?: "default" | "sky";
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-500/15 bg-sky-500/5"
      : "border-border/60 bg-background/60";

  return (
    <FormItem className={`rounded-xl border p-3 ${toneClass} ${compact ? "h-full" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <FormLabel>{label}</FormLabel>
          <FormDescription className="text-[11px]">{description}</FormDescription>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
              checked ? "text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {checked ? "Ligado" : "Desligado"}
          </span>
          <FormControl>
            <Switch
              checked={checked}
              onCheckedChange={onCheckedChange}
              className="h-7 w-12 border border-border/80 bg-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-zinc-700"
            />
          </FormControl>
        </div>
      </div>
    </FormItem>
  );
}

function SettingsGroupLabel({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
