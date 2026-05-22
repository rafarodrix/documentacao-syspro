"use client";

import type { FormEvent, MouseEvent } from "react";
import { Button, Input, Label, Separator, Textarea } from "@dosc-syspro/ui";
import { FileSearch } from "lucide-react";
import { CRM_LEAD_SOURCE_VALUES, CRM_LEAD_STAGE_VALUES } from "@dosc-syspro/contracts/crm";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS } from "@/features/crm/domain/crm.types";
import { formatCNPJ } from "@/lib/formatters";
import type { LeadFormState } from "../../lead-management.types";

type Props = {
  editForm: LeadFormState;
  updateEditField: <K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) => void;
  isSavingForm: boolean;
  isLookupLoading: boolean;
  onSave: (event?: FormEvent<HTMLFormElement> | MouseEvent) => void;
  onLookupCnpj: () => void;
};

export function SheetDadosTab({ editForm, updateEditField, isSavingForm, isLookupLoading, onSave, onLookupCnpj }: Props) {
  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-title" className="text-xs font-semibold">Título do Lead *</Label>
          <Input id="edit-title" value={editForm.title} onChange={(e) => updateEditField("title", e.target.value)} placeholder="Ex.: Rede avaliando ERP" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-company-name" className="text-xs font-semibold">Empresa Potencial *</Label>
          <Input id="edit-company-name" value={editForm.companyName} onChange={(e) => updateEditField("companyName", e.target.value)} placeholder="Nome da empresa prospect" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-stage" className="text-xs font-semibold">Etapa do Funil</Label>
          <select
            id="edit-stage"
            value={editForm.stage}
            onChange={(e) => updateEditField("stage", e.target.value)}
            className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CRM_LEAD_STAGE_VALUES.map((stage) => (
              <option key={stage} value={stage}>{CRM_STAGE_LABELS[stage]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-source" className="text-xs font-semibold">Origem</Label>
          <select
            id="edit-source"
            value={editForm.source}
            onChange={(e) => updateEditField("source", e.target.value)}
            className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CRM_LEAD_SOURCE_VALUES.map((src) => (
              <option key={src} value={src}>{CRM_SOURCE_LABELS[src]}</option>
            ))}
          </select>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados Fiscais & CNPJ</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="edit-document" className="text-xs font-semibold">CNPJ</Label>
            <Input id="edit-document" value={editForm.document} onChange={(e) => updateEditField("document", formatCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="gap-1.5 h-10 text-xs" onClick={onLookupCnpj} disabled={isLookupLoading}>
              <FileSearch className="h-3.5 w-3.5" />
              {isLookupLoading ? "Buscando..." : "Consultar CNPJ"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-trade-name" className="text-xs font-semibold">Nome Fantasia</Label>
            <Input id="edit-trade-name" value={editForm.tradeName} onChange={(e) => updateEditField("tradeName", e.target.value)} placeholder="Nome fantasia" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-industry" className="text-xs font-semibold">Segmento</Label>
            <Input id="edit-industry" value={editForm.industry} onChange={(e) => updateEditField("industry", e.target.value)} placeholder="ERP, varejo, TI..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-city" className="text-xs font-semibold">Cidade</Label>
            <Input id="edit-city" value={editForm.city} onChange={(e) => updateEditField("city", e.target.value)} placeholder="Cidade" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-state" className="text-xs font-semibold">UF</Label>
            <Input id="edit-state" value={editForm.state} onChange={(e) => updateEditField("state", e.target.value.toUpperCase())} placeholder="UF" maxLength={8} />
          </div>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valores Comerciais</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-estimated-value" className="text-xs font-semibold">Valor Total Estimado</Label>
            <Input id="edit-estimated-value" type="number" step="0.01" value={editForm.estimatedValue} onChange={(e) => updateEditField("estimatedValue", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-license-value" className="text-xs font-semibold">Valor da Licença</Label>
            <Input id="edit-license-value" type="number" step="0.01" value={editForm.licenseValue} onChange={(e) => updateEditField("licenseValue", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-monthly-fee" className="text-xs font-semibold">Valor da Mensalidade</Label>
            <Input id="edit-monthly-fee" type="number" step="0.01" value={editForm.monthlyFee} onChange={(e) => updateEditField("monthlyFee", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-minimum-wage" className="text-xs font-semibold">% Salário Mínimo</Label>
            <Input id="edit-minimum-wage" type="number" step="0.0001" value={editForm.minimumWagePercentage} onChange={(e) => updateEditField("minimumWagePercentage", e.target.value)} placeholder="Ex.: 12.5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-expected-close" className="text-xs font-semibold">Fechamento Previsto</Label>
            <Input id="edit-expected-close" type="date" value={editForm.expectedCloseAt} onChange={(e) => updateEditField("expectedCloseAt", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-next-step" className="text-xs font-semibold">Próximo Passo</Label>
            <Input id="edit-next-step" value={editForm.nextStep} onChange={(e) => updateEditField("nextStep", e.target.value)} placeholder="Ex.: Agendar demo" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-notes" className="text-xs font-semibold">Notas de Qualificação</Label>
          <Textarea id="edit-notes" value={editForm.qualificationNotes} onChange={(e) => updateEditField("qualificationNotes", e.target.value)} rows={4} placeholder="Anote necessidades, dores, quantidade de usuários..." />
        </div>
        {editForm.stage === "LOST" && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
            <Label htmlFor="edit-lost-reason" className="text-xs font-semibold text-destructive">Motivo da Perda</Label>
            <Input id="edit-lost-reason" value={editForm.lostReason} onChange={(e) => updateEditField("lostReason", e.target.value)} placeholder="Por que perdemos essa oportunidade comercial?" className="border-destructive/60" />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-3">
        <Button type="button" onClick={onSave} disabled={isSavingForm} className="w-full sm:w-auto h-10 px-6 gap-2">
          {isSavingForm ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
