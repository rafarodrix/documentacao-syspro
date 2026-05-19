"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, Flag, Video } from "lucide-react";
import { Button, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Textarea } from "@dosc-syspro/ui";
import { trpc } from "@/lib/api/trpc-client";
import type { TicketDetailsItem } from "./ticket-view.types";

interface TicketFinalizeDialogProps {
  ticket: TicketDetailsItem;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ReleaseTypeValue = "BUG" | "MELHORIA" | "NOVA_FUNCIONALIDADE";

function inferReleaseType(ticket: TicketDetailsItem): ReleaseTypeValue | "" {
  const category = ticket.operations?.category?.toLowerCase() || "";
  if (category.includes("bug") || category.includes("incident") || category.includes("erro")) return "BUG";
  if (
    category.includes("nova funcionalidade") ||
    category.includes("nova_funcionalidade") ||
    category.includes("feature request") ||
    category.includes("new feature")
  ) {
    return "NOVA_FUNCIONALIDADE";
  }
  if (
    category.includes("melhoria") ||
    category.includes("enhancement") ||
    category.includes("feature") ||
    category.includes("performance") ||
    category.includes("refator")
  ) {
    return "MELHORIA";
  }

  return "";
}

function buildFollowUpTaskTitle(ticket: TicketDetailsItem) {
  return `Atualizacao pos-ticket #${ticket.number}`;
}

function buildFollowUpTaskDescription(ticket: TicketDetailsItem) {
  const base = [`Origem: ticket #${ticket.number}`, `Assunto: ${ticket.title}`];
  if (ticket.resolutionSummary?.trim()) {
    base.push("", "Resumo do fechamento:", ticket.resolutionSummary.trim());
  }
  return base.join("\n");
}

export function TicketFinalizeDialog({ ticket, trigger, open: controlledOpen, onOpenChange }: TicketFinalizeDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const currentTeam = (ticket.operations?.currentTeam || "").trim().toUpperCase();
  const isDevelopmentTicket = currentTeam === "DESENVOLVIMENTO";
  const inferredReleaseType = inferReleaseType(ticket);
  const effectiveReleaseType = inferredReleaseType || "MELHORIA";
  const shouldSuggestRelease = Boolean(ticket.publishToReleases || (isDevelopmentTicket && (ticket.resolvedAt || inferredReleaseType || ticket.operations?.module)));

  const [resolutionSummary, setResolutionSummary] = useState(ticket.resolutionSummary || "");
  const [resolutionVideoUrl, setResolutionVideoUrl] = useState(ticket.resolutionVideoUrl || "");
  const [releaseTitle, setReleaseTitle] = useState(ticket.releaseTitle || ticket.title || "");
  const [releaseModule, setReleaseModule] = useState(ticket.releaseModule || ticket.operations?.module || "");
  const [publishToReleases, setPublishToReleases] = useState(shouldSuggestRelease);
  const [createFollowUpTask, setCreateFollowUpTask] = useState(false);
  const [followUpTaskTitle, setFollowUpTaskTitle] = useState(buildFollowUpTaskTitle(ticket));
  const [followUpTaskDescription, setFollowUpTaskDescription] = useState(buildFollowUpTaskDescription(ticket));
  const [followUpTaskDueDays, setFollowUpTaskDueDays] = useState("3");
  const [followUpAssignToOwner, setFollowUpAssignToOwner] = useState(Boolean(ticket.ownerId));
  const [releaseType, setReleaseType] = useState<ReleaseTypeValue>(
    ticket.releaseType === "BUG" ||
      ticket.releaseType === "MELHORIA" ||
      ticket.releaseType === "NOVA_FUNCIONALIDADE"
      ? ticket.releaseType
      : effectiveReleaseType,
  );

  const shouldRequireReleaseFields = publishToReleases;
  const canCreateFollowUpTask = Boolean(ticket.companyId);
  const followUpDueDaysNumber = Number(followUpTaskDueDays);
  const canFinalize = useMemo(() => {
    if (isDevelopmentTicket && !resolutionSummary.trim()) return false;
    if (shouldRequireReleaseFields && !releaseTitle.trim()) return false;
    if (createFollowUpTask && !canCreateFollowUpTask) return false;
    if (createFollowUpTask && !followUpTaskTitle.trim()) return false;
    if (createFollowUpTask && (!Number.isFinite(followUpDueDaysNumber) || followUpDueDaysNumber < 0 || followUpDueDaysNumber > 365)) return false;
    return true;
  }, [canCreateFollowUpTask, createFollowUpTask, followUpDueDaysNumber, followUpTaskTitle, isDevelopmentTicket, releaseTitle, resolutionSummary, shouldRequireReleaseFields]);

  useEffect(() => {
    if (!open) return;
    setResolutionSummary(ticket.resolutionSummary || "");
    setResolutionVideoUrl(ticket.resolutionVideoUrl || "");
    setReleaseTitle(ticket.releaseTitle || ticket.title || "");
    setReleaseModule(ticket.releaseModule || ticket.operations?.module || "");
    setPublishToReleases(shouldSuggestRelease);
    setCreateFollowUpTask(false);
    setFollowUpTaskTitle(buildFollowUpTaskTitle(ticket));
    setFollowUpTaskDescription(buildFollowUpTaskDescription(ticket));
    setFollowUpTaskDueDays("3");
    setFollowUpAssignToOwner(Boolean(ticket.ownerId));
    setReleaseType(
      ticket.releaseType === "BUG" ||
        ticket.releaseType === "MELHORIA" ||
        ticket.releaseType === "NOVA_FUNCIONALIDADE"
        ? ticket.releaseType
        : effectiveReleaseType,
    );
  }, [
    effectiveReleaseType,
    open,
    shouldSuggestRelease,
    ticket.number,
    ticket.ownerId,
    ticket.releaseModule,
    ticket.releaseType,
    ticket.releaseTitle,
    ticket.resolutionSummary,
    ticket.resolutionVideoUrl,
    ticket.title,
    ticket.operations?.module,
  ]);

  const runFinalizeAction = () => {
    if (isDevelopmentTicket && !resolutionSummary.trim()) {
      toast.error("Preencha a resolucao aplicada para concluir o ticket.");
      return;
    }
    if (shouldRequireReleaseFields && !releaseType) {
      toast.error("Selecione o tipo da release para publicar no changelog.");
      return;
    }
    if (shouldRequireReleaseFields && !releaseTitle.trim()) {
      toast.error("Informe o titulo que vai aparecer no modulo de releases.");
      return;
    }
    if (createFollowUpTask && !canCreateFollowUpTask) {
      toast.error("O ticket precisa estar vinculado a uma empresa para gerar tarefa.");
      return;
    }
    if (createFollowUpTask && !followUpTaskTitle.trim()) {
      toast.error("Informe o titulo da tarefa de acompanhamento.");
      return;
    }
    if (createFollowUpTask && (!Number.isFinite(followUpDueDaysNumber) || followUpDueDaysNumber < 0 || followUpDueDaysNumber > 365)) {
      toast.error("Informe um prazo valido em dias para a tarefa de acompanhamento.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await trpc.tickets.finalize.mutate({
          id: String(ticket.id),
          data: {
            resolutionSummary: resolutionSummary.trim() || undefined,
            resolutionVideoUrl: resolutionVideoUrl.trim() || undefined,
            releaseType: shouldRequireReleaseFields ? releaseType : undefined,
            releaseTitle: shouldRequireReleaseFields ? releaseTitle.trim() || undefined : undefined,
            releaseModule: shouldRequireReleaseFields ? releaseModule.trim() || undefined : undefined,
            publishToReleases: isDevelopmentTicket ? publishToReleases : false,
            followUpTask: createFollowUpTask
              ? {
                  title: followUpTaskTitle.trim(),
                  description: followUpTaskDescription.trim() || resolutionSummary.trim() || undefined,
                  dueDays: followUpDueDaysNumber,
                  assignToOwner: followUpAssignToOwner && Boolean(ticket.ownerId),
                }
              : undefined,
          },
        });

        if (!result.success) {
          toast.error(result.error || "Nao foi possivel concluir o ticket.");
          return;
        }

        if (result.followUpTaskCreated) {
          toast.success("Ticket finalizado e tarefa de acompanhamento criada.");
        } else if (createFollowUpTask && result.followUpTaskSkippedReason === "existing_open_follow_up") {
          toast.success("Ticket finalizado. Ja existe uma tarefa aberta vinculada a este ticket.");
        } else {
          toast.success(
            publishToReleases
              ? "Ticket finalizado e publicado em Releases."
              : result.message || "Ticket finalizado com sucesso.",
          );
        }

        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Erro ao finalizar ticket.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 transition-colors text-xs">
            <Flag className="h-3 w-3" /> Finalizar Ticket
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Flag className="h-5 w-5" />
            Fechamento e Release
          </DialogTitle>
          <DialogDescription>
            Documente a solucao aplicada para fechar este chamado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumo do fechamento{isDevelopmentTicket ? " *" : ""}
            </Label>
            <Textarea
              rows={4}
              placeholder={isDevelopmentTicket ? "Descreva a solucao aplicada passo a passo..." : "Opcional. Informe como o atendimento foi encerrado."}
              className="text-xs resize-none"
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              disabled={isPending}
            />
            {isDevelopmentTicket && !resolutionSummary.trim() && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                A conclusao exige o preenchimento da resolucao aplicada.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video Explicativo</Label>
            <div className="relative">
              <Video className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="https://www.youtube.com/..."
                className="h-9 pl-7 text-xs"
                value={resolutionVideoUrl}
                onChange={(e) => setResolutionVideoUrl(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border/60 bg-muted/15 p-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Acompanhamento pos-fechamento
              </Label>
              <p className="text-xs text-muted-foreground">
                Gere uma tarefa avulsa para tratar ajustes, atualizacoes ou pendencias identificadas no fechamento.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <Checkbox
                checked={createFollowUpTask}
                onCheckedChange={(value) => setCreateFollowUpTask(value === true)}
                disabled={isPending || !canCreateFollowUpTask}
                className="mt-0.5"
              />
              <span>
                Gerar tarefa de atualizacao ao concluir este ticket
              </span>
            </label>

            {!canCreateFollowUpTask ? (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Vincule uma empresa ao ticket para habilitar a abertura de tarefa.
              </p>
            ) : null}

            {createFollowUpTask ? (
              <div className="grid gap-3 rounded-md border border-border/50 bg-background/80 p-3 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo da tarefa *</Label>
                  <Input
                    value={followUpTaskTitle}
                    onChange={(event) => setFollowUpTaskTitle(event.target.value)}
                    disabled={isPending}
                    placeholder="Ex: Atualizar parametrizacao apos homologacao"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descricao</Label>
                  <Textarea
                    rows={4}
                    value={followUpTaskDescription}
                    onChange={(event) => setFollowUpTaskDescription(event.target.value)}
                    disabled={isPending}
                    placeholder="Explique o que precisa ser ajustado ou acompanhado apos o fechamento."
                    className="text-xs resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prazo em dias *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpTaskDueDays}
                    onChange={(event) => setFollowUpTaskDueDays(event.target.value)}
                    disabled={isPending}
                    className="h-9 text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-xs text-foreground">
                  <Checkbox
                    checked={followUpAssignToOwner}
                    onCheckedChange={(value) => setFollowUpAssignToOwner(value === true)}
                    disabled={isPending || !ticket.ownerId}
                  />
                  <span>
                    Atribuir ao responsavel atual do ticket
                    {!ticket.ownerId ? " (sem responsavel definido)" : ""}
                  </span>
                </label>
              </div>
            ) : null}
          </div>

          {isDevelopmentTicket ? (
            <>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm text-foreground transition-colors hover:text-primary">
                <input
                  type="checkbox"
                  checked={publishToReleases}
                  onChange={(e) => setPublishToReleases(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                  disabled={isPending}
                />
                Publicar no painel de Releases ao cliente
              </label>

              {publishToReleases && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo da release *</Label>
                    <Select
                      value={releaseType}
                      onValueChange={(value) => setReleaseType(value as ReleaseTypeValue)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione o tipo da entrega" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUG">Bug</SelectItem>
                        <SelectItem value="MELHORIA">Melhoria</SelectItem>
                        <SelectItem value="NOVA_FUNCIONALIDADE">Nova funcionalidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo da release *</Label>
                    <Input
                      placeholder="Titulo publico (ex: Novo relatorio visual)"
                      className="h-9 text-xs"
                      value={releaseTitle}
                      onChange={(e) => setReleaseTitle(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modulo da release</Label>
                    <Input
                      placeholder="Modulo impactado"
                      className="h-9 text-xs"
                      value={releaseModule}
                      onChange={(e) => setReleaseModule(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              Tickets do setor de suporte sao concluidos sem publicacao em Releases.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={runFinalizeAction} disabled={isPending || !canFinalize} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {ticket.resolvedAt ? "Atualizar Fechamento" : "Concluir Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
