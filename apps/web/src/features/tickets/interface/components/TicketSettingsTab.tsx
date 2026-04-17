"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Clock, Loader2, Plus, Save, Settings2, Tag, Trash2, Workflow, MessageSquare, BriefcaseBusiness, Construction, HelpCircle } from "lucide-react";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  type TicketModuleSettings,
  ticketModuleSettingsSchema,
} from "@dosc-syspro/contracts/ticket";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveTicketSettingsAction } from "@/features/tickets/application/ticket-actions";

function createOptionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeTicketSettings(settings: TicketModuleSettings): TicketModuleSettings {
  return {
    ...settings,
    priorities: settings.priorities.map((priority) => {
      const resolutionMinutes = priority.resolutionMinutes ?? priority.slaHours * 60;
      return {
        ...priority,
        firstResponseMinutes: priority.firstResponseMinutes ?? Math.max(15, Math.min(240, Math.ceil(resolutionMinutes / 24))),
        resolutionMinutes,
        slaHours: Math.max(1, Math.ceil(resolutionMinutes / 60)),
      };
    }),
  };
}

export function TicketSettingsTab() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<TicketModuleSettings>({
    resolver: zodResolver(ticketModuleSettingsSchema),
    defaultValues: DEFAULT_TICKET_MODULE_SETTINGS,
  });

  const categoriesArray = useFieldArray({ control: form.control, name: "categories" });
  const teamsArray = useFieldArray({ control: form.control, name: "teams" });
  const modulesArray = useFieldArray({ control: form.control, name: "modules" });
  const environmentsArray = useFieldArray({ control: form.control, name: "environments" });
  const prioritiesArray = useFieldArray({ control: form.control, name: "priorities" });

  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
        if (!active) return;
        if (json.success && json.data) {
          form.reset(normalizeTicketSettings(json.data));
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar configuracoes de tickets:", error);
        toast.error("Nao foi possivel carregar as configuracoes de tickets.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form]);

  function onSubmit(data: TicketModuleSettings) {
    startTransition(async () => {
      try {
        const result = await saveTicketSettingsAction(normalizeTicketSettings(data));
        if (!result.success) {
          toast.error(result.error || "Erro ao salvar configuracoes.");
          return;
        }
        toast.success(result.message || "Configuracoes do modulo de tickets salvas.");
        
      } catch (error) {
        console.error("Erro ao salvar configuracoes:", error);
        toast.error("Processo falhou.");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/50 shadow-sm backdrop-blur-md">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Carregando configuracoes visuais...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full min-w-0 pb-16">
      <div className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm max-w-5xl">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-foreground/90">
          <p className="font-semibold text-primary">Configuracoes do Service Desk</p>
          <p className="mt-1 leading-relaxed">Painel gerencial centralizado. Controle o roteamento, funil de prioridades e os fluxos sistemicos do ticket usando as abas abaixos.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="workflow" className="w-full max-w-5xl space-y-6">
            <TabsList className="bg-muted/50 p-1 border border-border/40 h-auto grid w-full grid-cols-1 sm:grid-cols-3 md:w-fit">
              <TabsTrigger value="workflow" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Workflow & Automacao</span>
                <span className="sm:hidden">Workflow</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias & Tipos</span>
                <span className="sm:hidden">Categorias</span>
              </TabsTrigger>
              <TabsTrigger value="flow" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Workflow className="h-4 w-4" />
                <span className="hidden sm:inline">Metadados & Escalacao</span>
                <span className="sm:hidden">Fluxo</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workflow" className="space-y-6 animate-in zoom-in-95 duration-300 outline-none">
              <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary/70" /> Respostas & Auto-Atribuicao
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="autoAssignToCreator" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 bg-background hover:bg-muted/10 transition-colors p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-foreground">Auto-atribuicao de Tickets Internos</FormLabel>
                        <FormDescription className="text-xs">
                          Operadores (sistemas) tornam-se donos do ticket ao abrirem via Portal internamente.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="autoResponseEnabled" render={({ field }) => (
                    <FormItem className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background hover:bg-muted/10 transition-colors p-4 shadow-sm">
                      <div className="flex items-center justify-between w-full">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base text-foreground">Auto Resposta (Abertura)</FormLabel>
                          <FormDescription className="text-xs break-words">Disparar macro assim que cliente criar chamado.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                      {field.value && (
                        <FormField control={form.control} name="autoResponseMessage" render={({ field: msgField }) => (
                           <FormControl>
                            <Textarea
                              rows={2}
                              className="mt-2 bg-muted/20 border-border/50"
                              placeholder="Faca assim: Ola cliente, recebemos..."
                              {...msgField}
                            />
                          </FormControl>
                        )} />
                      )}
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
              
              {/* Coming Soon Area - CSAT & Responses */}
              <div className="grid gap-6 md:grid-cols-2 opacity-60">
                 <Card className="border-dashed border-border/50 bg-muted/5 pointer-events-none grayscale">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-muted-foreground"><HelpCircle className="h-4 w-4"/> Pesquisa CSAT <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge></CardTitle>
                      <CardDescription className="text-xs">Enviar pesquisa de 1 a 5 estrelas quando Ticket for &apos;Resolvido&apos;.</CardDescription>
                    </CardHeader>
                 </Card>
                 <Card className="border-dashed border-border/50 bg-muted/5 pointer-events-none grayscale">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-muted-foreground"><MessageSquare className="h-4 w-4"/> Snippets Inteligentes <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge></CardTitle>
                      <CardDescription className="text-xs">Menu extra na leitura de tickets com respostas padronizadas globais.</CardDescription>
                    </CardHeader>
                 </Card>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6 animate-in zoom-in-95 duration-300 outline-none">
              <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Tag className="h-5 w-5 text-primary/70" /> Gerenciamento de Categorias
                      </CardTitle>
                      <CardDescription className="mt-1">Categorizacao visual e roteamento logico de tickets.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => categoriesArray.append({ id: createOptionId("cat"), label: "", value: "", defaultTeam: "SUPORTE" })}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar Categoria
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {categoriesArray.fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="grid items-start gap-3 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/20 transition-colors p-4 shadow-sm md:grid-cols-[1.5fr_1fr_180px_60px_40px]">
                      <div className="space-y-3">
                        <FormField control={form.control} name={`categories.${index}.label`} render={({field}) => (
                          <FormItem><FormControl><Input placeholder="Nome ex: Incidente" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`categories.${index}.description`} render={({field}) => (
                          <FormItem><FormControl><Input placeholder="Descrição ou observação da categoria..." className="text-xs h-8 text-muted-foreground" {...field} /></FormControl></FormItem>
                        )} />
                      </div>
                      
                      <FormField control={form.control} name={`categories.${index}.value`} render={({field}) => (
                        <FormItem><FormControl><Input placeholder="slug-unico" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`categories.${index}.defaultTeam`} render={({field}) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value || "SUPORTE"}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Roteia para..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {form.watch("teams").map((t) => (
                                <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`categories.${index}.icon`} render={({field}) => (
                        <FormItem>
                           <Select onValueChange={field.onChange} value={field.value || "🔴"}>
                            <FormControl>
                              <SelectTrigger className="px-2 font-emoji"><SelectValue placeholder="🔴" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="🔴">🔴</SelectItem>
                              <SelectItem value="🟡">🟡</SelectItem>
                              <SelectItem value="🟢">🟢</SelectItem>
                              <SelectItem value="🔵">🔵</SelectItem>
                              <SelectItem value="💬">💬</SelectItem>
                              <SelectItem value="⚙️">⚙️</SelectItem>
                              <SelectItem value="📚">📚</SelectItem>
                              <SelectItem value="📝">📝</SelectItem>
                              <SelectItem value="💾">💾</SelectItem>
                              <SelectItem value="🔗">🔗</SelectItem>
                              <SelectItem value="🐞">🐞</SelectItem>
                              <SelectItem value="✨">✨</SelectItem>
                              <SelectItem value="🚀">🚀</SelectItem>
                              <SelectItem value="⚡">⚡</SelectItem>
                              <SelectItem value="🛠️">🛠️</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => categoriesArray.remove(index)} className="hover:bg-destructive/10 hover:text-destructive self-start mt-1 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {categoriesArray.fields.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                      <p>Nenhuma categoria cadastrada. Os clientes não terão opções na criação via Portal.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flow" className="space-y-6 animate-in zoom-in-95 duration-300 outline-none">
              <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
                 <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BriefcaseBusiness className="h-5 w-5 text-primary/70" /> Parâmetros Padrões Globais
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid gap-6 md:grid-cols-3">
                  <FormField control={form.control} name="defaultTeam" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Padrao Global</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("teams").map((team) => (
                            <SelectItem key={team.id} value={team.value}>{team.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="defaultEnvironment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente Padrao</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("environments").map((env) => (
                            <SelectItem key={env.id} value={env.value}>{env.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="defaultPriority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade Inbound</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("priorities").map((p) => (
                            <SelectItem key={p.id} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
                 <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Construction className="h-5 w-5 text-primary/70" /> Estruturas do Workspace
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-10 pt-6">
                  {/* TIMES */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <h4 className="font-semibold text-foreground">Equipes Ativas</h4>
                       <Button type="button" variant="ghost" size="sm" onClick={() => teamsArray.append({ id: createOptionId("team"), label: "", value: "" })}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Equipe
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {teamsArray.fields.map((fieldItem, index) => (
                        <div key={fieldItem.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/20 p-2 pl-3">
                          <FormField control={form.control} name={`teams.${index}.label`} render={({field}) => <Input placeholder="Nome" className="h-8 shadow-none border-dashed bg-transparent" {...field} />} />
                          <FormField control={form.control} name={`teams.${index}.value`} render={({field}) => <Input placeholder="SLUG" className="h-8 shadow-none w-20 border-0 uppercase text-xs text-muted-foreground bg-transparent" {...field} />} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => teamsArray.remove(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MODULOS E AMBIENTES */}
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <h4 className="font-semibold text-foreground">Mapeamento Syspro</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => modulesArray.append({ id: createOptionId("mod"), label: "", value: "" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add Modulo
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {modulesArray.fields.map((fieldItem, index) => (
                           <div key={fieldItem.id} className="flex items-center gap-2">
                            <FormField control={form.control} name={`modules.${index}.label`} render={({field}) => <Input placeholder="Módulo" className="h-9" {...field} />} />
                            <FormField control={form.control} name={`modules.${index}.value`} render={({field}) => <Input placeholder="slug" className="h-9 w-24" {...field} />} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => modulesArray.remove(index)} className="h-9 w-9 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <h4 className="font-semibold text-foreground">Ambientes Deployment</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => environmentsArray.append({ id: createOptionId("env"), label: "", value: "" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add Ambiente
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {environmentsArray.fields.map((fieldItem, index) => (
                           <div key={fieldItem.id} className="flex items-center gap-2">
                            <FormField control={form.control} name={`environments.${index}.label`} render={({field}) => <Input placeholder="Ambiente" className="h-9" {...field} />} />
                            <FormField control={form.control} name={`environments.${index}.value`} render={({field}) => <Input placeholder="slug" className="h-9 w-24" {...field} />} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => environmentsArray.remove(index)} className="h-9 w-9 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SLA CARD */}
              <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md overflow-hidden">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-primary/70" /> Politicas de SLA por prioridade
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {prioritiesArray.fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="grid items-center gap-4 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/10 transition-colors p-4 shadow-sm md:grid-cols-[1fr_140px_180px_180px]">
                      <FormField control={form.control} name={`priorities.${index}.label`} render={({field}) => (
                        <FormItem><FormControl><Input placeholder="Nome da prioridade" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`priorities.${index}.value`} render={({field}) => (
                        <FormItem><FormControl><Input placeholder="Level (ex: normal)" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`priorities.${index}.firstResponseMinutes`} render={({field}) => (
                        <FormItem>
                           <FormControl>
                            <div className="relative">
                              <Input type="number" min={1} max={10080} value={field.value ?? ""} onChange={e => field.onChange(parseInt(e.target.value) || 1)} className="pr-12 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-400 font-semibold border-amber-200/50" />
                              <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold tracking-wider text-muted-foreground pointer-events-none">1A RESP.</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`priorities.${index}.resolutionMinutes`} render={({field}) => (
                        <FormItem>
                           <FormControl>
                            <div className="relative">
                              <Input type="number" min={1} max={43200} value={field.value ?? ""} onChange={e => {
                                const minutes = parseInt(e.target.value) || 1;
                                field.onChange(minutes);
                                form.setValue(`priorities.${index}.slaHours`, Math.max(1, Math.ceil(minutes / 60)), { shouldDirty: true });
                              }} className="pr-12 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 dark:text-blue-400 font-semibold border-blue-200/50" />
                              <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold tracking-wider text-muted-foreground pointer-events-none">RESOL.</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Coming Soon Area - Working Hours & Escalation */}
              <div className="grid gap-6 md:grid-cols-2 opacity-60">
                 <Card className="border-dashed border-border/50 bg-muted/5 pointer-events-none grayscale">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-muted-foreground"><Clock className="h-4 w-4"/> Horário Coorporativo <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge></CardTitle>
                      <CardDescription className="text-xs">Definir finais de semana e feriados para que os relógios de SLA sejam interrompidos automaticamente.</CardDescription>
                    </CardHeader>
                 </Card>
                 <Card className="border-dashed border-border/50 bg-muted/5 pointer-events-none grayscale">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-muted-foreground"><AlertCircle className="h-4 w-4"/> Regras de Escalonamento <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge></CardTitle>
                      <CardDescription className="text-xs">Notificar gerência caso o SLA fique acima de 80% do deadline sem primeira resposta preenchida.</CardDescription>
                    </CardHeader>
                 </Card>
              </div>
            </TabsContent>

          </Tabs>

          <div className="fixed sm:absolute bottom-6 right-6 z-40 lg:right-10 flex">
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-2xl ring-1 ring-border shadow-primary/10">
              <Button type="submit" disabled={isPending} className="min-w-[200px] h-11 text-base font-semibold shadow-md transition-all hover:scale-105 active:scale-95" size="lg">
                {isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Padrões...</>
                ) : (
                  <><Save className="mr-2 h-5 w-5" /> Adotar Modificações</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Badge({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) {
   return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</span>
}
