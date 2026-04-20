"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_EVOLUTION_SETTINGS,
  EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS,
  evolutionSettingsSchema,
  type EvolutionSettings,
} from "@dosc-syspro/contracts/evolution";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Save, RefreshCw, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import {
  getEvolutionSettingsAction,
  updateEvolutionSettingsAction,
} from "@/features/evolution/application/evolution-actions";

function LabelWithHelp({ htmlFor, label, help }: { htmlFor?: string; label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={`Ajuda: ${label}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 whitespace-pre-line text-left text-xs" side="top">
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function EvolutionSettingsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<EvolutionSettings>(DEFAULT_EVOLUTION_SETTINGS);

  const subscribeOptions = useMemo(() => EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS, []);

  async function loadSettings() {
    setIsLoading(true);
    const result = await getEvolutionSettingsAction();
    if (!result.success) {
      toast.error("Falha ao carregar configuracoes do Evolution.");
      setSettings(DEFAULT_EVOLUTION_SETTINGS);
      setIsLoading(false);
      return;
    }

    setSettings(result.settings);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function toggleSubscribe(eventName: string, checked: boolean) {
    setSettings((prev) => {
      const current = new Set(prev.subscribe);
      if (checked) current.add(eventName as (typeof EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS)[number]);
      else current.delete(eventName as (typeof EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS)[number]);

      const subscribe = Array.from(current);
      if (subscribe.length === 0) {
        subscribe.push("ALL");
      }

      return { ...prev, subscribe };
    });
  }

  async function save() {
    setIsSaving(true);
    const validation = evolutionSettingsSchema.safeParse(settings);
    if (!validation.success) {
      toast.error("Dados invalidos. Revise os campos.");
      setIsSaving(false);
      return;
    }

    const result = await updateEvolutionSettingsAction(validation.data);
    if (!result.success) {
      toast.error("Falha ao salvar configuracoes do Evolution.");
      setIsSaving(false);
      return;
    }

    setSettings(result.settings);
    toast.success(result.message ?? "Configuracoes salvas.");
    setIsSaving(false);
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp / Evolution Go</h1>
        <p className="text-muted-foreground">
          Configuracao administrativa da integracao Evolution Go para webhook e eventos assinados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuracoes do Webhook</CardTitle>
          <CardDescription>
            Esses dados definem a configuracao exata esperada da instancia Evolution Go. O backend usa os valores salvos aqui para casar a instancia do webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando configuracoes...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <LabelWithHelp
                    htmlFor="webhookUrl"
                    label="Webhook URL"
                    help={
                      "URL publica do backend que recebe eventos do Evolution.\n" +
                      "Preencher com: https://SEU_BACKEND/api/webhooks/evolution\n" +
                      "Eventos atualmente tratados pelo backend: MESSAGE, GROUP e READ_RECEIPT."
                    }
                  />
                  <Input
                    id="webhookUrl"
                    value={settings.webhookUrl}
                    onChange={(event) => setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))}
                    placeholder="https://backend.seudominio.com.br/api/webhooks/evolution"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithHelp
                    htmlFor="phone"
                    label="Phone (pairing code)"
                    help={
                      "Numero para pareamento da instancia no Evolution.\n" +
                      "Formato recomendado: 55DDDNUMERO (apenas digitos).\n" +
                      "Use o numero WhatsApp oficial da conexao.\n" +
                      "Esse campo e administrativo e pode ser usado em provisionamento manual da instancia."
                    }
                  />
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(event) => setSettings((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="5534XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithHelp
                    htmlFor="instance"
                    label="Instance"
                    help={
                      "Alias/nome exato da instancia na Evolution.\n" +
                      "Use exatamente o mesmo valor exibido na instancia para o backend casar o webhook.\n" +
                      "Esse valor nao deve mais depender do .env."
                    }
                  />
                  <Input
                    id="instance"
                    value={settings.instance}
                    onChange={(event) => setSettings((prev) => ({ ...prev, instance: event.target.value }))}
                    placeholder="Trilink"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithHelp
                    htmlFor="instanceId"
                    label="Instance ID"
                    help={
                      "Identificador exato da instancia na Evolution.\n" +
                      "Preencha se sua instalacao expor esse campo no manager e voce quiser casamento mais preciso.\n" +
                      "Esse valor fica persistido nas configuracoes do portal."
                    }
                  />
                  <Input
                    id="instanceId"
                    value={settings.instanceId}
                    onChange={(event) => setSettings((prev) => ({ ...prev, instanceId: event.target.value }))}
                    placeholder="uuid-da-instancia"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <LabelWithHelp
                    htmlFor="instanceToken"
                    label="Instance Token"
                    help={
                      "Token opcional de validacao do webhook da Evolution.\n" +
                      "So preencha se sua instancia realmente enviar instanceToken no payload.\n" +
                      "Se preencher aqui, o backend passa a exigir esse mesmo valor."
                    }
                  />
                  <Input
                    id="instanceToken"
                    value={settings.instanceToken}
                    onChange={(event) => setSettings((prev) => ({ ...prev, instanceToken: event.target.value }))}
                    placeholder="token-opcional-da-instancia"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <LabelWithHelp
                  label="Eventos Assinados (subscribe)"
                  help={
                    "Define quais eventos o Evolution enviara para o webhook.\n" +
                    "Para o backend atual, use ALL ou selecione ao menos MESSAGE e READ_RECEIPT.\n" +
                    "Se grupos forem assinados separadamente no Evolution Go 0.7.0, inclua GROUP.\n" +
                    "Esses nomes seguem o padrao da documentacao da Evolution Go."
                  }
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {subscribeOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox
                        checked={settings.subscribe.includes(option)}
                        onCheckedChange={(checked) => toggleSubscribe(option, checked === true)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <LabelWithHelp
                  label="Comportamento de Entrega"
                  help={
                    "O backend atual usa esta configuracao apenas para o fluxo principal da Evolution Go.\n" +
                    "Mantenha Immediate ativado salvo se houver necessidade operacional especifica."
                  }
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.immediate}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, immediate: checked === true }))}
                    />
                    <span>Immediate</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={isLoading || isSaving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recarregar
          </Button>
          <Button onClick={save} disabled={isLoading || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar configuracoes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comportamento Atual</CardTitle>
          <CardDescription>
            Resumo do que o backend utiliza hoje no fluxo principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Webhook inbound processa `MESSAGE`, `messages.upsert`, `GROUP` para grupos permitidos, `READ_RECEIPT` e `Receipt`.</p>
          <p>- Outbound prioriza as rotas `/send/text` e `/send/media` da Evolution Go, com fallback para o contrato v2 quando necessario.</p>
          <p>- Salvar esta tela persiste a configuracao administrativa no backend; isso nao garante provisionamento automatico da instancia.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Minimo</CardTitle>
          <CardDescription>
            Itens necessarios para o primeiro teste ponta a ponta funcionar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Evolution Go deve apontar para `POST /api/webhooks/evolution` com `MESSAGE` e `READ_RECEIPT` habilitados; para grupos sem `ALL`, habilite tambem `GROUP`.</p>
          <p>- O backend precisa ter `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` configurados.</p>
          <p>- Os campos `Instance`, `Instance ID` e `Instance Token` desta tela sao a fonte de verdade para o casamento exato do webhook.</p>
          <p>- O Chatwoot precisa apontar webhook para `POST /api/webhooks/chatwoot`; `/webhooks/chatwoot` tambem e aceito como alias.</p>
          <p>- O fluxo principal atual depende de `message_created` no Chatwoot para enviar respostas ao WhatsApp.</p>
        </CardContent>
      </Card>
    </div>
  );
}
