"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, Flag, Video } from "lucide-react";
import { finalizeTicketAction } from "@/features/tickets/application/ticket-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TicketDetailsItem } from "./types";

interface TicketFinalizeDialogProps {
  ticket: TicketDetailsItem;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function inferReleaseType(ticket: TicketDetailsItem): "BUG" | "MELHORIA" | "" {
  const category = ticket.operations?.category?.toLowerCase() || "";
  if (category.includes("bug") || category.includes("incident") || category.includes("erro")) return "BUG";
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
  const releaseType = ticket.releaseType === "BUG" || ticket.releaseType === "MELHORIA" ? ticket.releaseType : effectiveReleaseType;

  const shouldRequireReleaseFields = publishToReleases;
  const canFinalize = useMemo(() => {
    if (!resolutionSummary.trim()) return false;
    if (shouldRequireReleaseFields && !releaseTitle.trim()) return false;
    return true;
  }, [releaseTitle, resolutionSummary, shouldRequireReleaseFields]);

  useEffect(() => {
    if (!open) return;
    setResolutionSummary(ticket.resolutionSummary || "");
    setResolutionVideoUrl(ticket.resolutionVideoUrl || "");
    setReleaseTitle(ticket.releaseTitle || ticket.title || "");
    setReleaseModule(ticket.releaseModule || ticket.operations?.module || "");
    setPublishToReleases(shouldSuggestRelease);
  }, [
    open,
    shouldSuggestRelease,
    ticket.releaseModule,
    ticket.releaseTitle,
    ticket.resolutionSummary,
    ticket.resolutionVideoUrl,
    ticket.title,
    ticket.operations?.module,
  ]);

  const runFinalizeAction = () => {
    if (!resolutionSummary.trim()) {
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
    startTransition(async () => {
      try {
        const result = await finalizeTicketAction({
          ticketId: String(ticket.id),
          resolutionSummary,
          resolutionVideoUrl,
          releaseType: shouldRequireReleaseFields ? releaseType : undefined,
          releaseTitle: shouldRequireReleaseFields ? releaseTitle : undefined,
          releaseModule: shouldRequireReleaseFields ? releaseModule : undefined,
          publishToReleases: isDevelopmentTicket ? publishToReleases : false,
        });

        if (!result.success) {
          toast.error(result.error || "Nao foi possivel concluir o ticket.");
          return;
        }

        toast.success(
          publishToReleases
            ? "Ticket finalizado e publicado em Releases."
            : result.message || "Ticket finalizado com sucesso.",
        );
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
      <DialogContent className="sm:max-w-[500px]">
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolucao Aplicada *</Label>
            <Textarea
              rows={4}
              placeholder="Descreva a solucao aplicada passo a passo..."
              className="text-xs resize-none"
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              disabled={isPending}
            />
            {!resolutionSummary.trim() && (
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
