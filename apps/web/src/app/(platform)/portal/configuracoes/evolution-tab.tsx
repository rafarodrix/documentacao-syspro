"use client";

import Image from "next/image";
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
import { Loader2, Save, RefreshCw, CircleHelp, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  type EvolutionQrCodeResult,
  getEvolutionSettingsAction,
  requestEvolutionQrCodeAction,
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
  const [isGeneratingQrCode, setIsGeneratingQrCode] = useState(false);
  const [settings, setSettings] = useState<EvolutionSettings>(DEFAULT_EVOLUTION_SETTINGS);
  const [qrCodeResult, setQrCodeResult] = useState<EvolutionQrCodeResult | null>(null);

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

  async function generateQrCode() {
    setIsGeneratingQrCode(true);
    setQrCodeResult(null);

    const validation = evolutionSettingsSchema.safeParse(settings);
    if (!validation.success) {
      toast.error("Dados invalidos. Revise os campos antes de gerar o QR Code.");
      setIsGeneratingQrCode(false);
      return;
    }

    const saveResult = await updateEvolutionSettingsAction(validation.data);
    if (!saveResult.success) {
      toast.error("Falha ao salvar configuracoes antes de gerar o QR Code.");
      setIsGeneratingQrCode(false);
      return;
    }

    setSettings(saveResult.settings);

    const result = await requestEvolutionQrCodeAction();
    if (!result.success) {
      toast.error(result.message ?? "Falha ao gerar QR Code na Evolution.");
      setIsGeneratingQrCode(false);
      return;
    }

    setQrCodeResult(result.data);
    if (result.data.qrCode || result.data.code) {
      toast.success(result.message ?? "QR Code recebido.");
    } else {
      toast.info(result.message ?? "Conexao aplicada. Aguarde o evento QRCode chegar no webhook.");
    }
    setIsGeneratingQrCode(false);
  }

  const qrCodeImageSrc = useMemo(() => normalizeQrCodeImage(qrCodeResult?.qrCode), [qrCodeResult?.qrCode]);

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
                      "Eventos atualmente tratados pelo backend: Message, Receipt, Call, QRCode e Group quando vier com payload de mensagem."
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
                    "Para o backend atual, use ALL ou selecione ao menos MESSAGE, READ_RECEIPT, CONNECTION e QRCODE.\n" +
                    "Se grupos forem assinados separadamente, inclua GROUP.\n" +
                    "Ao gerar QR Code, o backend sempre envia QRCODE e CONNECTION para o POST /instance/connect."
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
          <Button variant="secondary" onClick={generateQrCode} disabled={isLoading || isSaving || isGeneratingQrCode}>
            {isGeneratingQrCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
            Gerar QR Code
          </Button>
        </CardFooter>
      </Card>

      {qrCodeResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Conexao WhatsApp
            </CardTitle>
            <CardDescription>
              Instancia {qrCodeResult.instance} via {qrCodeResult.endpoint}
              {qrCodeResult.receivedAt ? ` - QR recebido em ${new Date(qrCodeResult.receivedAt).toLocaleString("pt-BR")}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="flex min-h-55 items-center justify-center rounded-lg border bg-background p-4">
              {qrCodeImageSrc ? (
                <Image
                  src={qrCodeImageSrc}
                  alt={`QR Code da instancia ${qrCodeResult.instance}`}
                  width={192}
                  height={192}
                  unoptimized
                  className="h-48 w-48 rounded-sm object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                  <QrCode className="h-10 w-10" />
                  Conexao aplicada. Aguardando evento QRCode chegar no webhook.
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {qrCodeResult.code ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="mb-2 font-medium text-foreground">Codigo bruto da Evolution</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{qrCodeResult.code}</p>
                </div>
              ) : null}

              <div className="rounded-lg border bg-muted/20 p-4 text-muted-foreground">
                <p>Fluxo oficial Evolution Go: o portal chama `POST /instance/connect` e a Evolution envia o QR por evento `QRCode` para o webhook configurado.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Comportamento Atual</CardTitle>
          <CardDescription>
            Resumo do que o backend utiliza hoje no fluxo principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Webhook inbound processa `MESSAGE`, `messages.upsert`, `GROUP` para grupos permitidos, `READ_RECEIPT` e `Receipt`.</p>
          <p>- O QR Code segue o fluxo oficial da Evolution Go: `POST /instance/connect` e evento `QRCode` recebido no webhook.</p>
          <p>- Outbound prioriza as rotas `/send/text` e `/send/media` da Evolution Go.</p>
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
          <p>- Evolution Go deve apontar para `POST /api/webhooks/evolution` com `MESSAGE`, `READ_RECEIPT`, `CONNECTION` e `QRCODE` habilitados; para grupos sem `ALL`, habilite tambem `GROUP`.</p>
          <p>- O backend precisa ter `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` configurados.</p>
          <p>- `Instance ID` e obrigatorio para aplicar `POST /instance/connect` na Evolution Go.</p>
          <p>- Os campos `Instance`, `Instance ID` e `Instance Token` desta tela sao a fonte de verdade para o casamento exato do webhook.</p>
          <p>- O Chatwoot precisa apontar webhook para `POST /api/webhooks/chatwoot`; `/webhooks/chatwoot` tambem e aceito como alias.</p>
          <p>- O fluxo principal atual depende de `message_created` no Chatwoot para enviar respostas ao WhatsApp.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeQrCodeImage(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(raw)) return raw;
  if (/^[a-zA-Z0-9+/=\s]+$/.test(raw) && raw.length > 80) {
    return `data:image/png;base64,${raw.replace(/\s+/g, "")}`;
  }
  return null;
}
