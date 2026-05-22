"use client";

import type { DragEvent } from "react";
import { Badge, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator } from "@dosc-syspro/ui";
import { GripVertical, PencilLine } from "lucide-react";
import type { CrmLead, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS } from "@/features/crm/domain/crm.types";
import { formatLeadCurrency } from "@/features/crm/domain/crm.types";
import { cn, formatDateSafe } from "@/lib/utils";
import { getLeadAttentionState, normalizeStageForSelect, resolveLeadContactName } from "../lead-management.helpers";
import { STAGE_SELECT_OPTIONS } from "../lead-management.constants";

// ── LeadSignal ────────────────────────────────────────────────────────────────

export function LeadSignal({ tone, text }: { tone: "red" | "amber" | "violet" | "slate"; text: string }) {
  const toneClass = {
    red: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    slate: "border-border/60 bg-muted/40 text-muted-foreground",
  }[tone];
  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-medium", toneClass)}>{text}</span>;
}

// ── LeadMeta ──────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import { UserRound } from "lucide-react";

export function LeadMeta({ icon: Icon, text }: { icon?: LucideIcon; text: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
      <span className="line-clamp-2">{text}</span>
    </div>
  );
}

// ── LeadCard ──────────────────────────────────────────────────────────────────

type LeadCardProps = {
  lead: CrmLead;
  isSaving: boolean;
  onEdit: () => void;
  onStageChange: (stage: CrmLeadStage) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, leadId: string) => void;
  onDragEnd: () => void;
};

export function LeadCard({ lead, isSaving, onEdit, onStageChange, onDragStart, onDragEnd }: LeadCardProps) {
  const attention = getLeadAttentionState(lead);

  return (
    <div
      draggable={!isSaving}
      onDragStart={(event) => onDragStart(event, lead.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border border-border/60 bg-background p-3 shadow-sm transition-opacity",
        isSaving && "cursor-wait opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 rounded-md border border-border/60 p-1 text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">{lead.companyName}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{lead.title}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} disabled={isSaving}>
          <PencilLine className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2 text-xs text-muted-foreground">
        <LeadMeta icon={UserRound} text={resolveLeadContactName(lead)} />
        <LeadMeta text={CRM_SOURCE_LABELS[lead.source]} />
        <LeadMeta text={formatLeadCurrency(lead.estimatedValue)} />
        {lead.expectedCloseAt ? <LeadMeta text={`Fechamento: ${formatDateSafe(lead.expectedCloseAt)}`} /> : null}
        {lead.nextStep ? <LeadMeta text={lead.nextStep} /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {attention.isOverdue ? <LeadSignal tone="red" text="Fechamento atrasado" /> : null}
        {attention.isDueSoon ? <LeadSignal tone="amber" text="Fechando em breve" /> : null}
        {!attention.hasNextStep ? <LeadSignal tone="violet" text="Sem proximo passo" /> : null}
        {attention.isStale ? <LeadSignal tone="slate" text={`${attention.daysWithoutUpdate}d sem atualizacao`} /> : null}
      </div>

      <div className="mt-4 grid gap-2">
        <Select value={normalizeStageForSelect(lead.stage)} onValueChange={(v) => onStageChange(v as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger><SelectValue placeholder="Mover etapa" /></SelectTrigger>
          <SelectContent>
            {STAGE_SELECT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── ClosedLeadCard ────────────────────────────────────────────────────────────

type ClosedLeadCardProps = {
  lead: CrmLead;
  isSaving: boolean;
  onEdit: () => void;
  onStageChange: (stage: CrmLeadStage) => void;
};

export function ClosedLeadCard({ lead, isSaving, onEdit, onStageChange }: ClosedLeadCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-muted/20 p-4", isSaving && "opacity-60")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lead.stage === "WON" ? "default" : "outline"}>{CRM_STAGE_LABELS[lead.stage]}</Badge>
            <Badge variant="secondary">{CRM_SOURCE_LABELS[lead.source]}</Badge>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{lead.companyName}</p>
            <p className="text-sm text-muted-foreground">{lead.title}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onEdit} disabled={isSaving}>
          <PencilLine className="mr-2 h-4 w-4" /> Editar
        </Button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Contato</p>
          <p className="mt-1">{resolveLeadContactName(lead)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Valor</p>
          <p className="mt-1">{formatLeadCurrency(lead.estimatedValue)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Fechamento previsto</p>
          <p className="mt-1">{formatDateSafe(lead.expectedCloseAt, "Nao informado")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">{lead.stage === "LOST" ? "Motivo da perda" : "Proximo passo"}</p>
          <p className="mt-1">{lead.stage === "LOST" ? lead.lostReason || "Nao informado" : lead.nextStep || "Nao informado"}</p>
        </div>
      </div>

      <div className="mt-4">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mover para</Label>
        <Select value={normalizeStageForSelect(lead.stage)} onValueChange={(v) => onStageChange(v as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGE_SELECT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
