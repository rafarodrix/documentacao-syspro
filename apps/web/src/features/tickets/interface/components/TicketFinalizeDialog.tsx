"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Flag, Video } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const inferredReleaseType = inferReleaseType(ticket);
  const shouldSuggestRelease = Boolean(ticket.publishToReleases || inferredReleaseType || ticket.operations?.currentTeam === "DESENVOLVIMENTO");

  const [resolutionSummary, setResolutionSummary] = useState(ticket.resolutionSummary || "");
  const [resolutionVideoUrl, setResolutionVideoUrl] = useState(ticket.resolutionVideoUrl || "");
  const [releaseTitle, setReleaseTitle] = useState(ticket.releaseTitle || ticket.title || "");
  const [releaseType, setReleaseType] = useState<"BUG" | "MELHORIA" | "">(
    ticket.releaseType === "BUG" || ticket.releaseType === "MELHORIA" ? ticket.releaseType : inferredReleaseType
  );
  const [releaseModule, setReleaseModule] = useState(ticket.releaseModule || ticket.operations?.module || "");
  const [publishToReleases, setPublishToReleases] = useState(shouldSuggestRelease);

  const shouldRequireReleaseFields = publishToReleases;

  const runFinalizeAction = () => {
    if (!resolutionSummary.trim()) {
      toast.error("Resolucao obrigatoria para finalizar o ticket.");
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
          releaseType: shouldRequireReleaseFields && releaseType ? releaseType : undefined,
          releaseTitle: shouldRequireReleaseFields ? releaseTitle : undefined,
          releaseModule,
          publishToReleases,
        });

        if (!result.success) {
          toast.error(result.error);
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
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:text-primary transition-colors border p-3 rounded-md bg-muted/20">
            <input
              type="checkbox"
              checked={publishToReleases}
              onChange={(e) => setPublishToReleases(e.target.checked)}
              className="rounded border-border accent-primary h-4 w-4"
              disabled={isPending}
            />
            Publicar no painel de Releases ao cliente
          </label>

          {publishToReleases && (
            <div className="grid gap-3 p-3 border border-border/80 rounded-md bg-secondary/10 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo da release *</Label>
                <Input
                  placeholder="Titulo publico (ex: Novo relatorio visual)"
                  className="text-xs h-9"
                  value={releaseTitle}
                  onChange={(e) => setReleaseTitle(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-3">
                <div className="space-y-1 w-full">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo *</Label>
                  <Select value={releaseType} onValueChange={(val) => setReleaseType(val as "BUG" | "MELHORIA" | "")} disabled={isPending}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MELHORIA">Melhoria</SelectItem>
                      <SelectItem value="BUG">Correcao (Bug)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-full">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modulo</Label>
                  <Input
                    placeholder="Ex.: Financeiro"
                    className="text-xs h-9"
                    value={releaseModule}
                    onChange={(e) => setReleaseModule(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video Explicativo</Label>
                <div className="relative">
                  <Video className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="https://www.youtube.com/..."
                    className="text-xs h-9 pl-7"
                    value={resolutionVideoUrl}
                    onChange={(e) => setResolutionVideoUrl(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={runFinalizeAction} disabled={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {ticket.resolvedAt ? "Atualizar Fechamento" : "Concluir Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
