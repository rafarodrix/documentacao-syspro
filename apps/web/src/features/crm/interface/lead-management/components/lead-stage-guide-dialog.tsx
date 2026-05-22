import { Badge, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@dosc-syspro/ui";
import { STAGE_GUIDE_ITEMS } from "../lead-management.constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeadStageGuideDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Como interpretar as etapas</DialogTitle>
          <DialogDescription>
            Este apoio reduz duvida operacional e ajuda o time a mover o lead no momento certo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {STAGE_GUIDE_ITEMS.map((stage) => (
            <div key={stage.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
                </div>
                <Badge variant={stage.active ? "secondary" : "outline"}>
                  {stage.active ? "Etapa ativa" : "Resultado"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
