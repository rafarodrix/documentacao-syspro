"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cpu, Link2, Loader2, Search, Unlink } from "lucide-react";
import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchAgentDeviceListClient } from "@/features/agents/application/agent-client.queries";
import { patchAgentDevice } from "@/features/agents/application/agent-write.actions";
import { LinkedDeviceCard } from "./linked-device-card";

export function AgentLinkSection({
  hostId,
  linkedDevice,
}: {
  hostId: string;
  linkedDevice: AgentDeviceSummary | null;
}) {
  const router = useRouter();
  const [isLinking, startLinking] = useTransition();
  const [isUnlinking, startUnlinking] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [devices, setDevices] = useState<AgentDeviceSummary[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  useEffect(() => {
    if (!pickerOpen) return;
    setIsLoadingDevices(true);
    fetchAgentDeviceListClient({ search: search.trim() || undefined, pageSize: 20 })
      .then((r) => setDevices(r.items))
      .catch(() => setDevices([]))
      .finally(() => setIsLoadingDevices(false));
  }, [pickerOpen, search]);

  function handleLink(deviceId: string) {
    startLinking(async () => {
      try {
        await patchAgentDevice(deviceId, { remoteHostId: hostId });
        toast.success("Dispositivo vinculado com sucesso.");
        setPickerOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao vincular dispositivo.");
      }
    });
  }

  function handleUnlink() {
    if (!linkedDevice) return;
    startUnlinking(async () => {
      try {
        await patchAgentDevice(linkedDevice.deviceId, { remoteHostId: null });
        toast.success("Dispositivo desvinculado.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao desvincular dispositivo.");
      }
    });
  }

  if (linkedDevice) {
    return (
      <div className="space-y-2">
        <LinkedDeviceCard device={linkedDevice} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={isUnlinking}
            >
              {isUnlinking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlink className="h-3 w-3" />
              )}
              Desvincular dispositivo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desvincular dispositivo?</AlertDialogTitle>
              <AlertDialogDescription>
                O dispositivo{" "}
                <span className="font-mono font-medium">
                  {linkedDevice.hostname ?? linkedDevice.deviceId}
                </span>{" "}
                será desvinculado deste host. O match automático por hostname pode
                recriá-lo no próximo heartbeat do agente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnlink}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desvincular
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-6 text-center">
        <Cpu className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Nenhum dispositivo vinculado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          O match automático por hostname ocorre no próximo heartbeat do agente.
        </p>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-4 gap-2" disabled={isLinking}>
            <Link2 className="h-3.5 w-3.5" />
            Vincular dispositivo
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular dispositivo ao host</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por hostname, deviceId ou SO..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoadingDevices && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </div>
          )}
          {!isLoadingDevices && devices.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum dispositivo encontrado.
            </p>
          )}
          {!isLoadingDevices &&
            devices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => handleLink(device.deviceId)}
                disabled={isLinking}
                className="flex w-full items-start gap-3 rounded-lg border border-border/40 bg-background/50 p-3 text-left transition-colors hover:bg-muted/30 disabled:opacity-50"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    device.isOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {device.hostname ?? device.deviceId}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {device.os ?? "SO desconhecido"}
                  </p>
                  {device.remoteHostName && (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                      Já vinculado: {device.remoteHostName}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {device.agentVersion ?? "—"}
                </span>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
