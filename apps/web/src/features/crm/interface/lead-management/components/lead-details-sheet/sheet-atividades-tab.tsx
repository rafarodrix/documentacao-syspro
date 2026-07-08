"use client";

import { Button, Label, Separator, Textarea } from "@dosc-syspro/ui";
import { Calendar, Phone, Mail, FileText, Settings, MessageSquare, Plus } from "lucide-react";
import type { CrmActivity } from "@dosc-syspro/contracts/crm";
import { cn, formatDateSafe } from "@/lib/utils";

type Props = {
  activities: CrmActivity[];
  newActivityBody: string;
  setNewActivityBody: (value: string) => void;
  newActivityType: "NOTE" | "CALL" | "MEETING" | "EMAIL" | "WHATSAPP";
  setNewActivityType: (type: "NOTE" | "CALL" | "MEETING" | "EMAIL" | "WHATSAPP") => void;
  isPostingActivity: boolean;
  onAddActivity: () => void;
};

const iconMap = {
  NOTE: FileText,
  CALL: Phone,
  MEETING: Calendar,
  EMAIL: Mail,
  WHATSAPP: MessageSquare,
  SYSTEM_EVENT: Settings,
} as const;

const typeLabels = {
  NOTE: "Anotação",
  CALL: "Ligação",
  MEETING: "Reunião",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  SYSTEM_EVENT: "Sistema",
} as const;

const typeTones = {
  NOTE: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  CALL: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  MEETING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  EMAIL: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  WHATSAPP: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  SYSTEM_EVENT: "bg-purple-500/10 text-purple-500 border-purple-500/20",
} as const;

export function SheetAtividadesTab({
  activities,
  newActivityBody,
  setNewActivityBody,
  newActivityType,
  setNewActivityType,
  isPostingActivity,
  onAddActivity,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nova Interação Comercial</Label>
        
        {/* Selection buttons row */}
        <div className="flex flex-wrap gap-2">
          {(["NOTE", "CALL", "MEETING", "EMAIL", "WHATSAPP"] as const).map((type) => {
            const Icon = iconMap[type];
            const isSelected = newActivityType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setNewActivityType(type)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all select-none",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105"
                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3.5" />
                {typeLabels[type]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <Textarea
            value={newActivityBody}
            onChange={(e) => setNewActivityBody(e.target.value)}
            placeholder="Anote detalhes de ligações, reuniões feitas, status comercial ou próximos passos..."
            rows={3}
            className="text-xs focus-visible:ring-1"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={onAddActivity} disabled={isPostingActivity || !newActivityBody.trim()} size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Registrar
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linha do Tempo</p>
        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
            Nenhuma atividade registrada para este lead.
          </div>
        ) : (
          <div className="relative pl-6 border-l border-border/60 space-y-6 py-2 ml-3">
            {activities.map((act) => {
              const isSystem = act.type === "SYSTEM_EVENT";
              const type = act.type as keyof typeof iconMap;
              const Icon = iconMap[type] || FileText;
              const tone = typeTones[type] || typeTones.NOTE;

              return (
                <div key={act.id} className="relative space-y-1">
                  {/* Styled Icon Marker on Timeline */}
                  <div className={cn(
                    "absolute -left-[37px] top-0.5 h-6 w-6 rounded-full border bg-background flex items-center justify-center shadow-sm transition-colors",
                    tone
                  )}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs font-bold text-foreground">
                      {act.title || (isSystem ? "Evento de Sistema" : "Anotação Comercial")}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-semibold">{formatDateSafe(act.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{act.body}</p>
                  {act.authorName && (
                    <p className="text-[9px] text-muted-foreground/80 italic mt-0.5">Registrado por: {act.authorName}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
