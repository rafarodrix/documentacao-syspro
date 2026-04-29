"use client";

import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  BellRing,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function createBindingId() {
  return `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
    },
  };
}

const WHATSAPP_AUTOMATION_FIELDS = [
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

export function AutomationSettingsTab() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<AutomationModuleSettings>({
    resolver: zodResolver(automationModuleSettingsSchema),
    defaultValues: DEFAULT_AUTOMATION_MODULE_SETTINGS,
  });

  const bindingsArray = useFieldArray({
    control: form.control,
    name: "whatsapp.bindings",
  });

  const autoResponseEnabled = form.watch("autoResponseEnabled");

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-10">
          <section className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Automacoes</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie regras automaticas e vinculos de grupos do WhatsApp sem acoplar a
              configuracao ao provider atual.
            </p>
          </section>

          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-lg bg-transparent p-0 md:w-fit">
              <TabsTrigger value="whatsapp" className="gap-1.5 text-xs">
                <MessageSquareText className="h-3.5 w-3.5" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

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
                      <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Auto-atribuir internos</FormLabel>
                          <FormDescription className="text-xs">
                            Operador vira responsavel ao abrir chamado pelo portal.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoResponseEnabled"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border border-border/60 bg-muted/10 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <FormLabel>Auto resposta</FormLabel>
                            <FormDescription className="text-xs">
                              Mensagem enviada na abertura do ticket para o cliente.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requireTestingReturnReason"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Motivo obrigatorio no retorno dos testes</FormLabel>
                          <FormDescription className="text-xs">
                            Exige justificativa ao voltar de Em teste para Em andamento.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {autoResponseEnabled && (
                    <FormField
                      control={form.control}
                      name="autoResponseMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem automatica</FormLabel>
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BellRing className="h-4 w-4 text-primary/70" />
                        Vinculos de grupos
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Cada vinculo representa um grupo real do WhatsApp. Habilite so as
                        automacoes que aquele grupo deve receber.
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
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                      Nenhum vinculo cadastrado. Crie um grupo e habilite as automacoes
                      desejadas.
                    </div>
                  )}

                  {bindingsArray.fields.map((fieldItem, index) => (
                    <div
                      key={fieldItem.id}
                      className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4"
                    >
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
                              <FormLabel>JID do grupo</FormLabel>
                              <FormControl>
                                <Input placeholder="1203630...@g.us" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`whatsapp.bindings.${index}.active`}
                          render={({ field }) => (
                            <FormItem className="rounded-lg border border-border/60 bg-background/60 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Ativo</FormLabel>
                                  <FormDescription className="text-[11px]">
                                    Liga ou desliga o vinculo.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </div>
                            </FormItem>
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

                      <div className="grid gap-3 md:grid-cols-2">
                        {WHATSAPP_AUTOMATION_FIELDS.map((automation) => (
                          <FormField
                            key={automation.key}
                            control={form.control}
                            name={`whatsapp.bindings.${index}.automations.${automation.key}`}
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/60 p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>{automation.label}</FormLabel>
                                  <FormDescription className="text-[11px]">
                                    {automation.description}
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-xl border border-border/60 bg-background/95 p-2 shadow-lg backdrop-blur">
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
