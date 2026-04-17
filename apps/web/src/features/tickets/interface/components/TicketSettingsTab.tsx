"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Clock, Loader2, Plus, Save, Settings2, Tag, Trash2, Workflow } from "lucide-react";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  type TicketModuleSettings,
  ticketModuleSettingsSchema,
} from "@dosc-syspro/contracts/ticket";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { saveTicketSettingsAction } from "@/features/tickets/application/ticket-actions";

function createOptionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
          form.reset(json.data);
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
        const result = await saveTicketSettingsAction(data);
        if (!result.success) {
          toast.error(result.error || "Erro ao salvar configuracoes.");
          return;
        }
        toast.success(result.message || "Configuracoes do modulo de tickets salvas.");
        
        // Re-fetch or soft update is not strictly needed since the form is already holding the fresh data
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
        <span className="text-sm font-medium text-muted-foreground">Carregando modulo de tickets...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-inner">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-foreground/90">
          <p className="font-semibold text-primary">Configuracoes Operacionais do Modulo</p>
          <p className="mt-1 leading-relaxed">Centralize categorias, times, modulos, ambientes e regras padrao para que os tickets nascam com contexto operacional consistente usando Actions.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-primary/70" />
                Workflow Padrao
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
              <FormField control={form.control} name="defaultTeam" render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor Padrao</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                  <FormLabel>Prioridade Padrao</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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

              <FormField control={form.control} name="autoAssignToCreator" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-foreground">Auto-atribuicao</FormLabel>
                    <FormDescription className="text-xs">
                      Tickets internos nascem atribuidos ao operador.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5 text-primary/70" /> Categorias
                </CardTitle>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => categoriesArray.append({ id: createOptionId("cat"), label: "", value: "", defaultTeam: "SUPORTE" })}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {categoriesArray.fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="grid items-start gap-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm md:grid-cols-[1.5fr_1fr_180px_100px_40px]">
                  <FormField control={form.control} name={`categories.${index}.label`} render={({field}) => (
                    <FormItem><FormControl><Input placeholder="Nome da categoria" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`categories.${index}.value`} render={({field}) => (
                    <FormItem><FormControl><Input placeholder="slug-unico" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`categories.${index}.defaultTeam`} render={({field}) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value || "SUPORTE"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Setor padrão" /></SelectTrigger>
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
                    <FormItem><FormControl><Input placeholder="Icone" {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => categoriesArray.remove(index)} className="hover:bg-destructive/10 hover:text-destructive self-start mt-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Workflow className="h-5 w-5 text-primary/70" /> Setup de Fluxos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-10 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <h4 className="font-semibold text-foreground">Times Operacionais</h4>
                  <Button type="button" variant="secondary" size="sm" onClick={() => teamsArray.append({ id: createOptionId("team"), label: "", value: "" })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Novo Time
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {teamsArray.fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 p-2 pl-3 group relative">
                      <FormField control={form.control} name={`teams.${index}.label`} render={({field}) => <Input placeholder="Nome" className="h-8 shadow-none" {...field} />} />
                      <FormField control={form.control} name={`teams.${index}.value`} render={({field}) => <Input placeholder="VALUE_ID" className="h-8 shadow-none uppercase" {...field} />} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => teamsArray.remove(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <h4 className="font-semibold text-foreground">Mapeamento de Módulos</h4>
                  <Button type="button" variant="secondary" size="sm" onClick={() => modulesArray.append({ id: createOptionId("mod"), label: "", value: "" })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Novo Modulo
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {modulesArray.fields.map((fieldItem, index) => (
                     <div key={fieldItem.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 p-2">
                      <FormField control={form.control} name={`modules.${index}.label`} render={({field}) => <Input placeholder="Módulo" className="h-8" {...field} />} />
                      <FormField control={form.control} name={`modules.${index}.value`} render={({field}) => <Input placeholder="slug" className="h-8" {...field} />} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => modulesArray.remove(index)} className="h-8 w-8 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <h4 className="font-semibold text-foreground">Ambientes Implantação</h4>
                  <Button type="button" variant="secondary" size="sm" onClick={() => environmentsArray.append({ id: createOptionId("env"), label: "", value: "" })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Novo Ambiente
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {environmentsArray.fields.map((fieldItem, index) => (
                     <div key={fieldItem.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 p-2">
                      <FormField control={form.control} name={`environments.${index}.label`} render={({field}) => <Input placeholder="Ambiente" className="h-8" {...field} />} />
                      <FormField control={form.control} name={`environments.${index}.value`} render={({field}) => <Input placeholder="slug" className="h-8" {...field} />} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => environmentsArray.remove(index)} className="h-8 w-8 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary/70" /> Prioridades e SLA
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {prioritiesArray.fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="grid items-center gap-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm md:grid-cols-[1fr_160px_160px]">
                  <FormField control={form.control} name={`priorities.${index}.label`} render={({field}) => (
                    <FormItem><FormControl><Input placeholder="Nome da prioridade" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`priorities.${index}.value`} render={({field}) => (
                    <FormItem><FormControl><Input placeholder="valor string" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`priorities.${index}.slaHours`} render={({field}) => (
                    <FormItem>
                       <FormControl>
                        <div className="relative">
                          <Input type="number" min={1} max={720} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} className="pr-12" />
                          <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground pointer-events-none">HORAS</span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-[250px_1fr]">
                <FormField control={form.control} name="autoResponseEnabled" render={({ field }) => (
                  <FormItem className="flex flex-col gap-2 p-1">
                    <div>
                      <FormLabel className="text-base text-foreground">Auto Resposta</FormLabel>
                      <FormDescription className="text-xs break-words">Mensagem padrão disparada na abertura do chamado.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="autoResponseMessage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Macro Inicial</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        className="bg-muted/20 border-border/50 shadow-inner"
                        placeholder="Mensagem enviada na abertura do ticket..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-6 z-10 flex justify-end">
            <div className="rounded-xl border border-border/50 bg-card/80 p-3 shadow-lg backdrop-blur-xl">
              <Button type="submit" disabled={isPending} className="min-w-[200px] h-11 text-base shadow-md transition-transform hover:-translate-y-0.5" size="lg">
                {isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="mr-2 h-5 w-5" /> Salvar Parametros</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
