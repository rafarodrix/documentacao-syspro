"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import { deleteAgentInstallation } from "@/features/agents/application/agent-write.actions";

export function AgentDeviceDeleteSection({
  deviceId,
  hostname,
}: {
  deviceId: string;
  hostname: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  const label = hostname ?? deviceId;

  return (
    <>
      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-500">
            <Trash2 className="h-5 w-5" />
            Remover agente
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            Remove o dispositivo do portal e bloqueia novos heartbeats até reinstalação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              O agente precisará ser reinstalado na máquina para voltar a aparecer na frota.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="gap-2 sm:shrink-0"
              onClick={() => setOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir agente
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir agente?"
        description={`O dispositivo "${label}" será removido do portal e bloqueado. Para voltar a aparecer, reinstale o agente Trilink na máquina.`}
        confirmLabel="Excluir agente"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        variant="danger"
        onConfirm={() => {
          startDeleting(async () => {
            try {
              await deleteAgentInstallation(deviceId);
              toast.success("Agente excluído. Reinstale o serviço na máquina para registrar novamente.");
              setOpen(false);
              router.push("/portal/infraestrutura?tab=agentes");
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Erro ao excluir agente.");
            }
          });
        }}
      />
    </>
  );
}
