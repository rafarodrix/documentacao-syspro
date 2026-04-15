"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertCircle, Clock, Loader2, Plus, Save, Settings2, Tag, Trash2, Workflow } from "lucide-react";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  type TicketModuleSettings,
  type TicketModuleSettingsOption,
  type TicketModuleSettingsPriority,
} from "@dosc-syspro/contracts/ticket";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function createOption(prefix: string): TicketModuleSettingsOption {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return { id, label: "", value: id };
}

export function TicketSettingsTab() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<TicketModuleSettings>(DEFAULT_TICKET_MODULE_SETTINGS);

  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
        if (!active) return;
        if (json.success && json.data) {
          setSettings(json.data);
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
  }, []);

  const updateOptionList = (
    key: "categories" | "teams" | "modules" | "environments",
    id: string,
    field: keyof TicketModuleSettingsOption,
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              ...(field === "label"
                ? {
                    value:
                      key === "teams"
                        ? value.trim().toUpperCase().replace(/\s+/g, "_")
                        : value
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, "_")
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, ""),
                  }
                : {}),
            }
          : item,
      ),
    }));
  };

  const removeOption = (key: "categories" | "teams" | "modules" | "environments", id: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].length > 1 ? prev[key].filter((item) => item.id !== id) : prev[key],
    }));
  };

  const updatePriority = (id: string, field: keyof TicketModuleSettingsPriority, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      priorities: prev.priorities.map((priority) => (priority.id === id ? { ...priority, [field]: value } : priority)),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/platform/settings/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await response.json()) as { success?: boolean; error?: string; message?: string; data?: TicketModuleSettings };

      if (!response.ok || !json.success) {
        toast.error(json.error || "Erro ao salvar configuracoes.");
        return;
      }

      if (json.data) {
        setSettings(json.data);
      }
      toast.success(json.message || "Configuracoes do modulo de tickets salvas.");
    } catch (error) {
      console.error("Erro ao salvar configuracoes de tickets:", error);
      toast.error("Erro ao salvar configuracoes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configuracoes de tickets...
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Configuracoes operacionais do modulo de tickets</p>
          <p className="mt-1">Centralize categorias, times, modulos, ambientes e regras padrao para que os tickets nascam com contexto operacional consistente.</p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary/70" />
            Workflow Padrao
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Setor padrao</Label>
            <Select value={settings.defaultTeam} onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultTeam: value as "SUPORTE" | "DESENVOLVIMENTO" }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {settings.teams.map((team) => (
                  <SelectItem key={team.id} value={team.value}>{team.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ambiente padrao</Label>
            <Select value={settings.defaultEnvironment} onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultEnvironment: value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {settings.environments.map((environment) => (
                  <SelectItem key={environment.id} value={environment.value}>{environment.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridade padrao</Label>
            <Select value={settings.defaultPriority} onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultPriority: value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {settings.priorities.map((priority) => (
                  <SelectItem key={priority.id} value={priority.value}>{priority.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
            <p className="text-sm font-medium text-foreground">Auto-atribuicao</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">Quando habilitado, tickets internos nascem atribuídos ao operador que abriu.</p>
              <Switch
                checked={settings.autoAssignToCreator}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoAssignToCreator: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <SettingsListCard
        title="Categorias"
        icon={Tag}
        description="Classificacoes funcionais do ticket. Cada categoria pode sugerir um setor padrao."
        onAdd={() => setSettings((prev) => ({ ...prev, categories: [...prev.categories, createOption("category")] }))}
      >
        {settings.categories.map((category) => (
          <div key={category.id} className="grid gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 md:grid-cols-[1.1fr_1fr_180px_120px_40px]">
            <Input value={category.label} onChange={(event) => updateOptionList("categories", category.id, "label", event.target.value)} placeholder="Nome da categoria" />
            <Input value={category.value} onChange={(event) => updateOptionList("categories", category.id, "value", event.target.value)} placeholder="slug" />
            <Select value={category.defaultTeam ?? settings.defaultTeam} onValueChange={(value) => setSettings((prev) => ({ ...prev, categories: prev.categories.map((item) => item.id === category.id ? { ...item, defaultTeam: value as "SUPORTE" | "DESENVOLVIMENTO" } : item) }))}>
              <SelectTrigger><SelectValue placeholder="Setor padrao" /></SelectTrigger>
              <SelectContent>
                {settings.teams.map((team) => (
                  <SelectItem key={team.id} value={team.value}>{team.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={category.icon ?? ""} onChange={(event) => updateOptionList("categories", category.id, "icon", event.target.value)} placeholder="Icone" />
            <Button variant="ghost" size="icon" onClick={() => removeOption("categories", category.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </SettingsListCard>

      <SettingsListCard
        title="Times, Modulos e Ambientes"
        icon={Workflow}
        description="Catalogos usados para roteamento, responsabilidade e contexto tecnico."
      >
        <TripleListEditor
          title="Times"
          items={settings.teams}
          onAdd={() => setSettings((prev) => ({ ...prev, teams: [...prev.teams, createOption("team")] }))}
          onChange={(id, field, value) => updateOptionList("teams", id, field, value)}
          onRemove={(id) => removeOption("teams", id)}
        />
        <TripleListEditor
          title="Modulos"
          items={settings.modules}
          onAdd={() => setSettings((prev) => ({ ...prev, modules: [...prev.modules, createOption("module")] }))}
          onChange={(id, field, value) => updateOptionList("modules", id, field, value)}
          onRemove={(id) => removeOption("modules", id)}
        />
        <TripleListEditor
          title="Ambientes"
          items={settings.environments}
          onAdd={() => setSettings((prev) => ({ ...prev, environments: [...prev.environments, createOption("environment")] }))}
          onChange={(id, field, value) => updateOptionList("environments", id, field, value)}
          onRemove={(id) => removeOption("environments", id)}
        />
      </SettingsListCard>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary/70" />
            Prioridades e SLA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {settings.priorities.map((priority) => (
            <div key={priority.id} className="grid gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 md:grid-cols-[1fr_160px_120px]">
              <Input value={priority.label} onChange={(event) => updatePriority(priority.id, "label", event.target.value)} placeholder="Nome da prioridade" />
              <Input value={priority.value} onChange={(event) => updatePriority(priority.id, "value", event.target.value)} placeholder="valor" />
              <Input type="number" min={1} max={720} value={priority.slaHours} onChange={(event) => updatePriority(priority.id, "slaHours", Number(event.target.value) || 1)} placeholder="SLA" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Automacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/10 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Resposta automatica</p>
              <p className="text-xs text-muted-foreground">Mensagem padrao para abertura de chamado.</p>
            </div>
            <Switch
              checked={settings.autoResponseEnabled}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoResponseEnabled: checked }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem automatica</Label>
            <Textarea
              rows={3}
              value={settings.autoResponseMessage}
              onChange={(event) => setSettings((prev) => ({ ...prev, autoResponseMessage: event.target.value }))}
              placeholder="Mensagem enviada na abertura do ticket..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[220px] gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configuracoes
        </Button>
      </div>
    </div>
  );
}

function SettingsListCard({
  title,
  icon: Icon,
  description,
  onAdd,
  children,
}: {
  title: string;
  icon: typeof Tag;
  description: string;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary/70" />
              {title}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          {onAdd ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">{children}</CardContent>
    </Card>
  );
}

function TripleListEditor({
  title,
  items,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  items: TicketModuleSettingsOption[];
  onAdd: () => void;
  onChange: (id: string, field: keyof TicketModuleSettingsOption, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Novo
        </Button>
      </div>
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 md:grid-cols-[1fr_1fr_40px]">
          <Input value={item.label} onChange={(event) => onChange(item.id, "label", event.target.value)} placeholder={`${title} - nome`} />
          <Input value={item.value} onChange={(event) => onChange(item.id, "value", event.target.value)} placeholder="valor" />
          <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
