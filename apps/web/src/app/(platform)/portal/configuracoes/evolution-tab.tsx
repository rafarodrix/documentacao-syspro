"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_EVOLUTION_SETTINGS,
  EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS,
  evolutionSettingsSchema,
  type EvolutionSettings,
} from "@dosc-syspro/contracts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getEvolutionSettingsAction,
  updateEvolutionSettingsAction,
} from "@/features/evolution/application/evolution-actions";

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
          Configuracao global da integracao Evolution Go para webhook e eventos assinados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuracoes do Webhook</CardTitle>
          <CardDescription>
            Esses dados definem como o Evolution Go envia eventos para o backend.
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
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={settings.webhookUrl}
                    onChange={(event) => setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))}
                    placeholder="https://backend.seudominio.com.br/api/webhooks/evolution"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (pairing code)</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(event) => setSettings((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="5534XXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Eventos Assinados (subscribe)</Label>
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
                <Label>Flags de Comportamento</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.immediate}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, immediate: checked === true }))}
                    />
                    <span>Immediate</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.webhookFiles}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, webhookFiles: checked === true }))}
                    />
                    <span>Webhook Files</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.eventIgnoreGroup}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, eventIgnoreGroup: checked === true }))}
                    />
                    <span>Ignorar eventos de grupo</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.eventIgnoreStatus}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, eventIgnoreStatus: checked === true }))}
                    />
                    <span>Ignorar status/broadcast</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.rabbitmqEnable}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, rabbitmqEnable: checked === true }))}
                    />
                    <span>RabbitMQ Enable</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.websocketEnable}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, websocketEnable: checked === true }))}
                    />
                    <span>WebSocket Enable</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={settings.natsEnable}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, natsEnable: checked === true }))}
                    />
                    <span>NATS Enable</span>
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
    </div>
  );
}
