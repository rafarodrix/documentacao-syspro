"use client";

import { CalendarDays, Loader2, Save } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input } from "@dosc-syspro/ui";
import { SectionCard } from "@/components/patterns";
import { FormField, SettingsGroup } from "../integration-form-primitives";
import { InfoTile, LoadingState, StatusTile } from "../integrations-primitives";
import { useGoogleCalendarSettings } from "../hooks/use-google-calendar-settings";

export function GoogleCalendarSettingsTab() {
  const { settings, isLoading, isSaving, setSettings, save } = useGoogleCalendarSettings();

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden border-border/40 bg-card/75 shadow-sm backdrop-blur-md dark:bg-zinc-950/45">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Google Agenda
            </CardTitle>
            <CardDescription>
              Cadastre a integracao de agenda para permitir sincronizacao futura de tarefas manuais e tarefas de follow-up.
            </CardDescription>
          </div>
          <Button size="sm" onClick={save} disabled={isLoading || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar integracao
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <LoadingState label="Carregando configuracao do Google Agenda..." />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <StatusTile label="Status" ok={settings.enabled} okText="Ativo" failText="Inativo" />
                <InfoTile label="Calendar ID" value={settings.calendarId || "Nao definido"} />
                <InfoTile label="Timezone" value={settings.timeZone || "Nao definida"} />
              </div>

              <SectionCard
                title="Conexao OAuth"
                description="Persistencia segura dos dados necessarios para publicar eventos no calendario alvo."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField id="google-calendar-id" label="Calendar ID">
                    <Input
                      id="google-calendar-id"
                      value={settings.calendarId}
                      onChange={(event) => setSettings((prev) => ({ ...prev, calendarId: event.target.value }))}
                      placeholder="primary ou equipe@group.calendar.google.com"
                    />
                  </FormField>
                  <FormField id="google-calendar-timezone" label="Timezone">
                    <Input
                      id="google-calendar-timezone"
                      value={settings.timeZone}
                      onChange={(event) => setSettings((prev) => ({ ...prev, timeZone: event.target.value }))}
                      placeholder="America/Sao_Paulo"
                    />
                  </FormField>
                  <FormField id="google-calendar-client-id" label="Client ID">
                    <Input
                      id="google-calendar-client-id"
                      value={settings.clientId}
                      onChange={(event) => setSettings((prev) => ({ ...prev, clientId: event.target.value }))}
                      placeholder="Client ID OAuth 2.0"
                    />
                  </FormField>
                  <FormField id="google-calendar-client-secret" label="Client Secret">
                    <Input
                      id="google-calendar-client-secret"
                      type="password"
                      value={settings.clientSecret}
                      onChange={(event) => setSettings((prev) => ({ ...prev, clientSecret: event.target.value }))}
                      placeholder="Client Secret do app Google"
                    />
                  </FormField>
                  <FormField id="google-calendar-refresh-token" label="Refresh Token">
                    <Input
                      id="google-calendar-refresh-token"
                      type="password"
                      value={settings.refreshToken}
                      onChange={(event) => setSettings((prev) => ({ ...prev, refreshToken: event.target.value }))}
                      placeholder="Refresh Token com acesso ao calendario"
                    />
                  </FormField>
                  <FormField
                    id="google-calendar-duration"
                    label="Duracao padrao do evento (minutos)"
                    description="Aplicado quando a tarefa nao informar uma duracao propria."
                  >
                    <Input
                      id="google-calendar-duration"
                      type="number"
                      min={5}
                      max={1440}
                      value={settings.defaultEventDurationMinutes}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultEventDurationMinutes: Number(event.target.value || prev.defaultEventDurationMinutes),
                        }))
                      }
                    />
                  </FormField>
                  <FormField
                    id="google-calendar-title-prefix"
                    label="Prefixo do titulo"
                    description="Opcional. Ex.: SYSPRO, SUPORTE ou FOLLOW-UP."
                  >
                    <Input
                      id="google-calendar-title-prefix"
                      value={settings.eventTitlePrefix}
                      onChange={(event) => setSettings((prev) => ({ ...prev, eventTitlePrefix: event.target.value }))}
                      placeholder="[SYSPRO]"
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SettingsGroup
                title="Regras de sincronizacao"
                description="Define quais tipos de tarefa poderao gerar eventos quando a sincronizacao for implementada no fluxo operacional."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background px-4 py-3">
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-foreground">Habilitar integracao</span>
                      <span className="block text-sm text-muted-foreground">Mantem a integracao disponivel para uso do modulo.</span>
                    </span>
                    <Checkbox
                      checked={settings.enabled}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked === true }))}
                    />
                  </label>
                  <label className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background px-4 py-3">
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-foreground">Sincronizar tarefas manuais</span>
                      <span className="block text-sm text-muted-foreground">Reserva o fluxo para tarefas abertas diretamente no modulo.</span>
                    </span>
                    <Checkbox
                      checked={settings.syncManualTasks}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, syncManualTasks: checked === true }))}
                    />
                  </label>
                  <label className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background px-4 py-3">
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-foreground">Sincronizar follow-up de tickets</span>
                      <span className="block text-sm text-muted-foreground">Mantem a ponte opcional apenas para tarefas abertas no encerramento do ticket.</span>
                    </span>
                    <Checkbox
                      checked={settings.syncTicketFollowUpTasks}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, syncTicketFollowUpTasks: checked === true }))
                      }
                    />
                  </label>
                </div>
              </SettingsGroup>

              <div className="rounded-xl border border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
                Esta entrega adiciona o Google Agenda como integracao nativa em Configuracoes. O proximo passo e ligar a criacao/atualizacao de eventos ao ciclo de vida das tarefas.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
