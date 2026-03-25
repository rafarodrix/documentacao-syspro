"use client";

import { useEffect, useState, useTransition } from "react";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2, MonitorCog, Save, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  remoteModuleSettingsSchema,
} from "@/features/remote/application/module-settings";
import {
  getRemoteModuleSettingsAction,
  updateRemoteModuleSettingsAction,
} from "@/features/remote/application/module-settings-actions";
import type { RemoteModuleSettings } from "@/features/remote/domain/model";

type RemoteModuleSettingsFormValues = z.input<typeof remoteModuleSettingsSchema>;

const defaultValues: RemoteModuleSettings = {
  rustDeskServerHost: "acesso.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey: "",
  rustDeskVersion: "1.4.6",
  heartbeatIntervalMinutes: 5,
  defaultPassword: "Trilink098",
};

export function RemoteModuleSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();

  const form = useForm<RemoteModuleSettingsFormValues>({
    resolver: zodResolver(remoteModuleSettingsSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await getRemoteModuleSettingsAction();
        if (!isMounted) return;

        if (result.success) {
          form.reset(result.data);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Erro ao carregar configuracoes do modulo remoto.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [form]);

  const onSubmit: SubmitHandler<RemoteModuleSettingsFormValues> = async (data) => {
    startTransition(async () => {
      const parsed = remoteModuleSettingsSchema.parse(data);
      const result = await updateRemoteModuleSettingsAction(parsed);
      if (result.success) {
        toast.success(result.message);
        form.reset(parsed);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando configuracoes do modulo remoto...</p>
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
              <MonitorCog className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Servidor RustDesk</CardTitle>
              <CardDescription>
                Estes valores alimentam o script padrao de descoberta e o instalador por host.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rustDeskServerHost">Host do servidor</Label>
            <Input id="rustDeskServerHost" placeholder="acesso.trilinksoftware.com.br" {...form.register("rustDeskServerHost")} />
            <p className="text-xs text-muted-foreground">Usado como `custom-rendezvous-server` nos scripts do agente.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rustDeskPublicKey">Chave publica</Label>
            <Input id="rustDeskPublicKey" placeholder="Cole a chave publica do seu servidor RustDesk" {...form.register("rustDeskPublicKey")} />
            <p className="text-xs text-muted-foreground">Opcional. Quando preenchida, o agente aplica `--option key` na instalacao.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="rustDeskServerConfig">Configuracao exportada</Label>
            <Textarea
              id="rustDeskServerConfig"
              rows={5}
              placeholder="Cole aqui a string exportada do RustDesk self-hosted"
              {...form.register("rustDeskServerConfig")}
            />
            <p className="text-xs text-muted-foreground">Essa string e aplicada no instalador para alinhar o cliente ao seu servidor proprio.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <TimerReset className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Politicas do agente</CardTitle>
              <CardDescription>
                Defaults operacionais aplicados na geracao dos scripts e no heartbeat recorrente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="rustDeskVersion">Versao alvo</Label>
            <Input id="rustDeskVersion" placeholder="1.4.6" {...form.register("rustDeskVersion")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heartbeatIntervalMinutes">Heartbeat (minutos)</Label>
            <Input
              id="heartbeatIntervalMinutes"
              type="number"
              min={1}
              max={120}
              {...form.register("heartbeatIntervalMinutes", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPassword">Senha padrao</Label>
            <Input id="defaultPassword" {...form.register("defaultPassword")} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Segredo de descoberta</CardTitle>
              <CardDescription>
                O `REMOTE_DISCOVERY_TOKEN` continua vindo do ambiente. A tela global controla infraestrutura RustDesk e defaults do agente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex justify-end pb-6">
        <Button type="submit" size="lg" disabled={isSaving || !form.formState.isDirty} className="min-w-[190px]">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar configuracoes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
