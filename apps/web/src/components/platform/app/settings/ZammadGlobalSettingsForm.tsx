"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Save, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getDefaultZammadGlobalSettings,
} from "@/features/tickets/application/zammad-global-settings-config";
import {
  type ZammadGlobalCatalog,
  type ZammadOwnerMode,
  zammadGlobalSettingsSchema,
} from "@dosc-syspro/contracts";
import {
  getZammadGlobalSettingsAction,
  updateZammadGlobalSettingsAction,
} from "@/features/tickets/application/zammad-global-settings-actions";

type ZammadGlobalSettingsFormInput = z.input<typeof zammadGlobalSettingsSchema>;
type ZammadGlobalSettingsFormValues = z.output<typeof zammadGlobalSettingsSchema>;

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function ZammadGlobalSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const [catalog, setCatalog] = useState<ZammadGlobalCatalog | null>(null);
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null);
  const [catalogSource, setCatalogSource] = useState<"live" | "snapshot" | null>(null);

  const form = useForm<ZammadGlobalSettingsFormInput, undefined, ZammadGlobalSettingsFormValues>({
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
        form.reset(result.data.settings);
        setCatalog(result.data.catalog);
        setCatalogSource(result.data.catalogSource);
        setCatalogWarning(result.data.warning);
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

  const groupOptions = useMemo(() => {
    const currentGroups = [
      form.watch("defaultGroup"),
      form.watch("roleDefaults.clienteAdmin.group"),
      form.watch("roleDefaults.clienteUser.group"),
      form.watch("roleDefaults.admin.group"),
      form.watch("roleDefaults.suporte.group"),
      form.watch("roleDefaults.developer.group"),
    ]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item));

    const catalogItems = (catalog?.groups ?? []).map((item) => ({ value: item.name, label: item.name }));
    const currentItems = currentGroups.map((value) => ({ value, label: `${value} (atual)` }));
    return uniqueBy([...catalogItems, ...currentItems], (item) => item.value.toLowerCase());
  }, [catalog, form]);

  const stateOptions = useMemo(() => {
    const currentStateIds = [
      form.watch("defaultStateId"),
      form.watch("roleDefaults.clienteAdmin.stateId"),
      form.watch("roleDefaults.clienteUser.stateId"),
      form.watch("roleDefaults.admin.stateId"),
      form.watch("roleDefaults.suporte.stateId"),
      form.watch("roleDefaults.developer.stateId"),
    ]
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);

    const catalogItems = (catalog?.states ?? []).map((item) => ({
      value: String(item.id),
      label: `${item.id} - ${item.name}`,
    }));
    const currentItems = currentStateIds.map((value) => ({
      value: String(value),
      label: `${value} - (atual)`,
    }));
    return uniqueBy([...catalogItems, ...currentItems], (item) => item.value);
  }, [catalog, form]);

  const priorityOptions = useMemo(() => {
    const currentPriorityIds = [
      form.watch("defaultPriorityId"),
      form.watch("roleDefaults.clienteAdmin.priorityId"),
      form.watch("roleDefaults.clienteUser.priorityId"),
      form.watch("roleDefaults.admin.priorityId"),
      form.watch("roleDefaults.suporte.priorityId"),
      form.watch("roleDefaults.developer.priorityId"),
    ]
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);

    const catalogItems = (catalog?.priorities ?? []).map((item) => ({
      value: String(item.id),
      label: `${item.id} ${item.name}`,
    }));
    const currentItems = currentPriorityIds.map((value) => ({
      value: String(value),
      label: `${value} (atual)`,
    }));
    return uniqueBy([...catalogItems, ...currentItems], (item) => item.value);
  }, [catalog, form]);

  const articleTypeOptions = useMemo(() => {
    const items = catalog?.articleTypes?.length ? catalog.articleTypes : ["note", "phone", "email"];
    return items.map((value) => ({
      value,
      label: value === "note" ? "Nota" : value === "phone" ? "Telefonema" : "E-mail",
    }));
  }, [catalog]);

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

  function renderGroupSelect(fieldPath: keyof ZammadGlobalSettingsFormValues | string, value: string) {
    return (
      <Select value={value} onValueChange={(next) => form.setValue(fieldPath as never, next as never, { shouldValidate: true })}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o grupo" />
        </SelectTrigger>
        <SelectContent>
          {groupOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function renderStateSelect(fieldPath: keyof ZammadGlobalSettingsFormValues | string, value: unknown) {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : "";
    return (
      <Select
        value={safeValue}
        onValueChange={(next) => form.setValue(fieldPath as never, Number(next) as never, { shouldValidate: true })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o state_id" />
        </SelectTrigger>
        <SelectContent>
          {stateOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function renderPrioritySelect(fieldPath: keyof ZammadGlobalSettingsFormValues | string, value: unknown) {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : "";
    return (
      <Select
        value={safeValue}
        onValueChange={(next) => form.setValue(fieldPath as never, Number(next) as never, { shouldValidate: true })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a prioridade" />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

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
      {catalogWarning ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Catalogo em modo fallback ({catalogSource === "snapshot" ? "snapshot" : "indisponivel"})</p>
              <p>{catalogWarning}</p>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Padroes globais de abertura</CardTitle>
              <CardDescription>Define os defaults usados pelo portal ao criar chamado no Zammad.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Grupo padrao</Label>
            {renderGroupSelect("defaultGroup", form.watch("defaultGroup"))}
          </div>

          <div className="space-y-2">
            <Label>Prioridade padrao</Label>
            {renderPrioritySelect("defaultPriorityId", form.watch("defaultPriorityId"))}
          </div>

          <div className="space-y-2">
            <Label>Estado padrao (state_id)</Label>
            {renderStateSelect("defaultStateId", form.watch("defaultStateId"))}
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
                {articleTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
                {renderGroupSelect("roleDefaults.clienteAdmin.group", form.watch("roleDefaults.clienteAdmin.group"))}
                {renderStateSelect("roleDefaults.clienteAdmin.stateId", form.watch("roleDefaults.clienteAdmin.stateId"))}
                {renderOwnerModeSelect(
                  "owner-cliente-admin",
                  form.watch("roleDefaults.clienteAdmin.ownerMode"),
                  (value) => form.setValue("roleDefaults.clienteAdmin.ownerMode", value, { shouldValidate: true })
                )}
                {renderPrioritySelect("roleDefaults.clienteAdmin.priorityId", form.watch("roleDefaults.clienteAdmin.priorityId"))}
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Cliente User</div>
                {renderGroupSelect("roleDefaults.clienteUser.group", form.watch("roleDefaults.clienteUser.group"))}
                {renderStateSelect("roleDefaults.clienteUser.stateId", form.watch("roleDefaults.clienteUser.stateId"))}
                {renderOwnerModeSelect(
                  "owner-cliente-user",
                  form.watch("roleDefaults.clienteUser.ownerMode"),
                  (value) => form.setValue("roleDefaults.clienteUser.ownerMode", value, { shouldValidate: true })
                )}
                {renderPrioritySelect("roleDefaults.clienteUser.priorityId", form.watch("roleDefaults.clienteUser.priorityId"))}
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Admin</div>
                {renderGroupSelect("roleDefaults.admin.group", form.watch("roleDefaults.admin.group"))}
                {renderStateSelect("roleDefaults.admin.stateId", form.watch("roleDefaults.admin.stateId"))}
                {renderOwnerModeSelect(
                  "owner-admin",
                  form.watch("roleDefaults.admin.ownerMode"),
                  (value) => form.setValue("roleDefaults.admin.ownerMode", value, { shouldValidate: true })
                )}
                {renderPrioritySelect("roleDefaults.admin.priorityId", form.watch("roleDefaults.admin.priorityId"))}
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Suporte</div>
                {renderGroupSelect("roleDefaults.suporte.group", form.watch("roleDefaults.suporte.group"))}
                {renderStateSelect("roleDefaults.suporte.stateId", form.watch("roleDefaults.suporte.stateId"))}
                {renderOwnerModeSelect(
                  "owner-suporte",
                  form.watch("roleDefaults.suporte.ownerMode"),
                  (value) => form.setValue("roleDefaults.suporte.ownerMode", value, { shouldValidate: true })
                )}
                {renderPrioritySelect("roleDefaults.suporte.priorityId", form.watch("roleDefaults.suporte.priorityId"))}
              </div>

              <div className="grid items-end gap-3 rounded-md border border-border/40 p-3 md:grid-cols-5">
                <div className="text-sm font-medium">Developer</div>
                {renderGroupSelect("roleDefaults.developer.group", form.watch("roleDefaults.developer.group"))}
                {renderStateSelect("roleDefaults.developer.stateId", form.watch("roleDefaults.developer.stateId"))}
                {renderOwnerModeSelect(
                  "owner-developer",
                  form.watch("roleDefaults.developer.ownerMode"),
                  (value) => form.setValue("roleDefaults.developer.ownerMode", value, { shouldValidate: true })
                )}
                {renderPrioritySelect("roleDefaults.developer.priorityId", form.watch("roleDefaults.developer.priorityId"))}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/50 p-4 md:col-span-2">
            <p className="text-sm font-medium">Owners disponiveis no Zammad (referencia)</p>
            <p className="text-xs text-muted-foreground">
              Lista consultiva para conferencia operacional. Atribuicao efetiva continua baseada no modo de owner por perfil.
            </p>
            <div className="max-h-36 overflow-auto rounded-md border border-border/40 bg-muted/20 p-2 text-xs text-muted-foreground">
              {catalog?.owners?.length ? (
                <ul className="space-y-1">
                  {catalog.owners.map((owner) => (
                    <li key={owner.id}>
                      #{owner.id} - {owner.name}
                      {owner.email ? ` (${owner.email})` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum owner retornado pelo catalogo do Zammad.</p>
              )}
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
