"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getDefaultZammadGlobalSettings,
  type ZammadOwnerMode,
  zammadGlobalSettingsSchema,
} from "@/features/tickets/application/zammad-global-settings";
import {
  getZammadGlobalSettingsAction,
  updateZammadGlobalSettingsAction,
} from "@/features/tickets/application/zammad-global-settings-actions";

export function ZammadGlobalSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  type ZammadGlobalSettingsFormValues = z.input<typeof zammadGlobalSettingsSchema>;

  const form = useForm<ZammadGlobalSettingsFormValues>({
    resolver: zodResolver(zammadGlobalSettingsSchema),
    defaultValues: getDefaultZammadGlobalSettings(),
    mode: "onChange",
  });

  function renderOwnerModeSelect(
    id: string,
    value: ZammadOwnerMode,
    onChange: (value: ZammadOwnerMode) => void
  ) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecione o modo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="UNASSIGNED">Sem proprietario</SelectItem>
          <SelectItem value="ASSIGN_CURRENT_AGENT">Atribuir ao agente atual</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const result = await getZammadGlobalSettingsAction();
        if (!mounted) return;
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        form.reset(result.data);
      } catch {
        toast.error("Erro ao carregar configuracoes globais do Zammad.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [form]);

  const onSubmit: SubmitHandler<ZammadGlobalSettingsFormValues> = (values) => {
    startSaving(async () => {
      try {
        const parsed = zammadGlobalSettingsSchema.parse(values);
        const result = await updateZammadGlobalSettingsAction(parsed);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        form.reset(parsed);
        toast.success(result.message ?? "Configuracoes salvas.");
      } catch {
        toast.error("Erro ao salvar configuracoes globais do Zammad.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando configuracoes globais do Zammad...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Padroes globais de abertura</CardTitle>
              <CardDescription>
                Define os defaults usados pelo portal ao criar chamado no Zammad.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaultGroup">Grupo padrao</Label>
            <Input id="defaultGroup" placeholder="Users" {...form.register("defaultGroup")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPriorityId">Prioridade padrao</Label>
            <Select
              value={String(form.watch("defaultPriorityId"))}
              onValueChange={(value) => form.setValue("defaultPriorityId", Number(value), { shouldValidate: true })}
            >
              <SelectTrigger id="defaultPriorityId">
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 low</SelectItem>
                <SelectItem value="2">2 normal</SelectItem>
                <SelectItem value="3">3 high</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultStateId">Estado padrao (state_id)</Label>
            <Input id="defaultStateId" type="number" min={1} {...form.register("defaultStateId", { valueAsNumber: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultArticleType">Canal padrao</Label>
            <Select
              value={form.watch("defaultArticleType")}
              onValueChange={(value: "note" | "phone" | "email") =>
                form.setValue("defaultArticleType", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="defaultArticleType">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Nota</SelectItem>
                <SelectItem value="phone">Telefonema</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultOwnerMode">Owner padrao</Label>
            {renderOwnerModeSelect(
              "defaultOwnerMode",
              form.watch("defaultOwnerMode"),
              (value) => form.setValue("defaultOwnerMode", value, { shouldValidate: true })
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="titlePrefix">Prefixo opcional no titulo</Label>
            <Input id="titlePrefix" placeholder="[Portal]" {...form.register("titlePrefix")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 md:col-span-2">
            <div>
              <p className="text-sm font-medium">Criar artigo como interno</p>
              <p className="text-xs text-muted-foreground">Ative apenas para fluxos de nota interna por padrao.</p>
            </div>
            <Switch
              checked={form.watch("defaultArticleInternal")}
              onCheckedChange={(checked) => form.setValue("defaultArticleInternal", checked, { shouldValidate: true })}
            />
          </div>

          <div className="space-y-4 rounded-lg border border-border/50 p-4 md:col-span-2">
            <div>
              <p className="text-sm font-medium">Mapeamento por perfil</p>
              <p className="text-xs text-muted-foreground">
                Override de grupo, estado, owner e prioridade para cada perfil no portal.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Cliente Admin</div>
                <Input placeholder="group" {...form.register("roleDefaults.clienteAdmin.group")} />
                <Input
                  type="number"
                  min={1}
                  placeholder="state_id"
                  {...form.register("roleDefaults.clienteAdmin.stateId", { valueAsNumber: true })}
                />
                {renderOwnerModeSelect(
                  "owner-cliente-admin",
                  form.watch("roleDefaults.clienteAdmin.ownerMode"),
                  (value) => form.setValue("roleDefaults.clienteAdmin.ownerMode", value, { shouldValidate: true })
                )}
                <Select
                  value={String(form.watch("roleDefaults.clienteAdmin.priorityId"))}
                  onValueChange={(value) =>
                    form.setValue("roleDefaults.clienteAdmin.priorityId", Number(value), { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 low</SelectItem>
                    <SelectItem value="2">2 normal</SelectItem>
                    <SelectItem value="3">3 high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Cliente User</div>
                <Input placeholder="group" {...form.register("roleDefaults.clienteUser.group")} />
                <Input type="number" min={1} {...form.register("roleDefaults.clienteUser.stateId", { valueAsNumber: true })} />
                {renderOwnerModeSelect(
                  "owner-cliente-user",
                  form.watch("roleDefaults.clienteUser.ownerMode"),
                  (value) => form.setValue("roleDefaults.clienteUser.ownerMode", value, { shouldValidate: true })
                )}
                <Select
                  value={String(form.watch("roleDefaults.clienteUser.priorityId"))}
                  onValueChange={(value) =>
                    form.setValue("roleDefaults.clienteUser.priorityId", Number(value), { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 low</SelectItem>
                    <SelectItem value="2">2 normal</SelectItem>
                    <SelectItem value="3">3 high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Admin</div>
                <Input placeholder="group" {...form.register("roleDefaults.admin.group")} />
                <Input type="number" min={1} {...form.register("roleDefaults.admin.stateId", { valueAsNumber: true })} />
                {renderOwnerModeSelect(
                  "owner-admin",
                  form.watch("roleDefaults.admin.ownerMode"),
                  (value) => form.setValue("roleDefaults.admin.ownerMode", value, { shouldValidate: true })
                )}
                <Select
                  value={String(form.watch("roleDefaults.admin.priorityId"))}
                  onValueChange={(value) =>
                    form.setValue("roleDefaults.admin.priorityId", Number(value), { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 low</SelectItem>
                    <SelectItem value="2">2 normal</SelectItem>
                    <SelectItem value="3">3 high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Suporte</div>
                <Input placeholder="group" {...form.register("roleDefaults.suporte.group")} />
                <Input type="number" min={1} {...form.register("roleDefaults.suporte.stateId", { valueAsNumber: true })} />
                {renderOwnerModeSelect(
                  "owner-suporte",
                  form.watch("roleDefaults.suporte.ownerMode"),
                  (value) => form.setValue("roleDefaults.suporte.ownerMode", value, { shouldValidate: true })
                )}
                <Select
                  value={String(form.watch("roleDefaults.suporte.priorityId"))}
                  onValueChange={(value) =>
                    form.setValue("roleDefaults.suporte.priorityId", Number(value), { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 low</SelectItem>
                    <SelectItem value="2">2 normal</SelectItem>
                    <SelectItem value="3">3 high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Developer</div>
                <Input placeholder="group" {...form.register("roleDefaults.developer.group")} />
                <Input type="number" min={1} {...form.register("roleDefaults.developer.stateId", { valueAsNumber: true })} />
                {renderOwnerModeSelect(
                  "owner-developer",
                  form.watch("roleDefaults.developer.ownerMode"),
                  (value) => form.setValue("roleDefaults.developer.ownerMode", value, { shouldValidate: true })
                )}
                <Select
                  value={String(form.watch("roleDefaults.developer.priorityId"))}
                  onValueChange={(value) =>
                    form.setValue("roleDefaults.developer.priorityId", Number(value), { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 low</SelectItem>
                    <SelectItem value="2">2 normal</SelectItem>
                    <SelectItem value="3">3 high</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configuracoes
        </Button>
      </div>
    </form>
  );
}
