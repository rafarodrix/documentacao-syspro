"use client";

import { Button, Label, Separator, Textarea } from "@dosc-syspro/ui";
import { MessageSquare } from "lucide-react";
import type { CrmActivity } from "@dosc-syspro/contracts/crm";
import { cn, formatDateSafe } from "@/lib/utils";

type Props = {
  activities: CrmActivity[];
  newActivityBody: string;
  setNewActivityBody: (value: string) => void;
  isPostingActivity: boolean;
  onAddActivity: () => void;
};

export function SheetAtividadesTab({ activities, newActivityBody, setNewActivityBody, isPostingActivity, onAddActivity }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Nova Anotação ou Histórico Comercial</Label>
        <div className="flex flex-col gap-2">
          <Textarea
            value={newActivityBody}
            onChange={(e) => setNewActivityBody(e.target.value)}
            placeholder="Anote detalhes de ligações, reuniões feitas, status comercial ou próximos passos..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={onAddActivity} disabled={isPostingActivity || !newActivityBody.trim()} size="sm" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Registrar
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
          <div className="relative pl-4 border-l border-border/60 space-y-5 py-2">
            {activities.map((act) => {
              const isSystem = act.type === "SYSTEM_EVENT";
              return (
                <div key={act.id} className="relative space-y-1">
                  <div className={cn(
                    "absolute -left-[21.5px] top-1.5 h-3.5 w-3.5 rounded-full border border-background flex items-center justify-center shadow-sm",
                    isSystem ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                  )}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs font-semibold text-foreground">
                      {act.title || (isSystem ? "Evento de Sistema" : "Anotação Comercial")}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{formatDateSafe(act.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{act.body}</p>
                  {act.authorName && (
                    <p className="text-[10px] text-muted-foreground italic mt-0.5">Registrado por: {act.authorName}</p>
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
