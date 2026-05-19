"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import {
  DEFAULT_TASK_MODULE_SETTINGS,
  taskModuleSettingsSchema,
  type TaskModuleSettings,
} from "@dosc-syspro/contracts/tarefas";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dosc-syspro/ui";

export function TarefasModuleSettingsTab() {
  const [settings, setSettings] = useState<TaskModuleSettings>(DEFAULT_TASK_MODULE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/tarefas", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = taskModuleSettingsSchema.safeParse(json?.data);
        if (active) {
          setSettings(parsed.success ? parsed.data : DEFAULT_TASK_MODULE_SETTINGS);
        }
      } catch {
        if (active) {
          setSettings(DEFAULT_TASK_MODULE_SETTINGS);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setIsSaving(true);
    const parsed = taskModuleSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error("Configuracao global de tarefas invalida.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/tarefas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar configuracoes de tarefas.");
        return;
      }

      const saved = taskModuleSettingsSchema.safeParse(json?.data);
      if (saved.success) {
        setSettings(saved.data);
      }
      toast.success(json?.message || "Configuracoes de tarefas salvas.");
    } catch {
      toast.error("Falha ao salvar configuracoes de tarefas.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Tarefas
          </CardTitle>
          <CardDescription>
            Defina o canal principal, fallback e regras operacionais globais do atendimento recorrente.
          </CardDescription>
        </div>
        <Button size="sm" onClick={save} disabled={isLoading || isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar configuracoes
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando configuracoes de tarefas...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={settings.defaultChannel === "CHATWOOT" ? "success" : "secondary"}>
                Canal principal: {settings.defaultChannel === "CHATWOOT" ? "Chatwoot" : "WhatsApp direto"}
              </Badge>
              <Badge variant="outline">
                Fallback: {settings.fallbackToDirectWhatsapp ? "Ativo" : "Desligado"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Canal padrao do disparo</Label>
                <Select
                  value={settings.defaultChannel}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultChannel: value as TaskModuleSettings["defaultChannel"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHATWOOT">Chatwoot</SelectItem>
                    <SelectItem value="DIRECT_WHATSAPP">WhatsApp direto / Evolution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Label global da rotina</Label>
                <Input
                  value={settings.routineLabel}
                  onChange={(event) => setSettings((prev) => ({ ...prev, routineLabel: event.target.value }))}
                  placeholder="rotina_mensal"
                />
              </div>

              <div className="space-y-2">
                <Label>Prefixo da label de competencia</Label>
                <Input
                  value={settings.competencyLabelPrefix}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, competencyLabelPrefix: event.target.value }))
                  }
                  placeholder="competencia"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow
                label="Usar fallback para WhatsApp direto"
                description="Se o fluxo via Chatwoot falhar, permite envio direto pela Evolution."
                checked={settings.fallbackToDirectWhatsapp}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, fallbackToDirectWhatsapp: checked === true }))
                }
              />
              <ToggleRow
                label="Reaproveitar conversa aberta"
                description="Prioriza continuar o atendimento na mesma conversa do Chatwoot."
                checked={settings.reuseOpenConversation}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, reuseOpenConversation: checked === true }))
                }
              />
              <ToggleRow
                label="Marcar conversa como pendente"
                description="Ao disparar a rotina, deixa a conversa em pending ate o retorno do cliente."
                checked={settings.markConversationAsPending}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, markConversationAsPending: checked === true }))
                }
              />
              <ToggleRow
                label="Criar nota privada ao disparar"
                description="Registra no Chatwoot que a rotina foi enviada a partir do portal."
                checked={settings.createPrivateNoteOnDispatch}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, createPrivateNoteOnDispatch: checked === true }))
                }
              />
              <ToggleRow
                label="Aplicar labels da rotina"
                description="Adiciona labels globais e da competencia para facilitar fila e automacoes."
                checked={settings.applyRoutineLabels}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, applyRoutineLabels: checked === true }))
                }
              />
              <ToggleRow
                label="Criar tarefa ao fechar ticket"
                description="Gera automaticamente uma tarefa de acompanhamento quando um ticket e resolvido."
                checked={settings.autoCreateOnTicketResolved}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, autoCreateOnTicketResolved: checked === true }))
                }
              />
            </div>

            {settings.autoCreateOnTicketResolved ? (
              <div className="grid gap-4 rounded-xl border border-border/50 bg-muted/10 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titulo da tarefa automatica</Label>
                  <Input
                    value={settings.autoTaskTitle}
                    onChange={(event) => setSettings((prev) => ({ ...prev, autoTaskTitle: event.target.value }))}
                    placeholder="Acompanhamento pos-atendimento — {ticket_subject}"
                  />
                  <p className="text-xs text-muted-foreground">Use {"{ticket_subject}"} para incluir o assunto do ticket.</p>
                </div>
                <div className="space-y-2">
                  <Label>Prazo da tarefa (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={String(settings.autoTaskDueDays)}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoTaskDueDays: Math.min(90, Math.max(1, Number(event.target.value || 3))),
                      }))
                    }
                  />
                </div>
                <ToggleRow
                  label="Atribuir ao responsavel do ticket"
                  description="A tarefa gerada sera atribuida ao mesmo colaborador responsavel pelo ticket."
                  checked={settings.autoTaskAssignToTicketOwner}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, autoTaskAssignToTicketOwner: checked === true }))
                  }
                />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      </div>
    </div>
  );
}
