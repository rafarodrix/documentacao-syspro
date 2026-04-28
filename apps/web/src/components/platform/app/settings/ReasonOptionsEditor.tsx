"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ReasonOption = {
  key: string;
  label: string;
  isActive: boolean;
  requiresDetails: boolean;
};

interface ReasonOptionsEditorProps<T extends ReasonOption> {
  title: string;
  description: string;
  options: T[];
  inputPrefix: string;
  onChange: (next: T[]) => void;
}

export function ReasonOptionsEditor<T extends ReasonOption>({
  title,
  description,
  options,
  inputPrefix,
  onChange,
}: ReasonOptionsEditorProps<T>) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3">
        {options.map((reason, index) => (
          <div
            key={reason.key}
            className="grid gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 md:grid-cols-[180px_minmax(0,1fr)_140px]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{reason.key}</p>
              <p className="text-[11px] text-muted-foreground">Chave tecnica compartilhada</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${inputPrefix}-${reason.key}`}>Rotulo</Label>
              <Input
                id={`${inputPrefix}-${reason.key}`}
                value={reason.label}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = { ...next[index], label: event.target.value };
                  onChange(next);
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Ativo</p>
                  <p className="text-[11px] text-muted-foreground">Exibir no modulo</p>
                </div>
                <Switch
                  checked={reason.isActive}
                  onCheckedChange={(checked) => {
                    const next = [...options];
                    next[index] = { ...next[index], isActive: checked };
                    onChange(next);
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Exigir detalhes</p>
                  <p className="text-[11px] text-muted-foreground">Campo complementar obrigatorio</p>
                </div>
                <Switch
                  checked={reason.requiresDetails}
                  onCheckedChange={(checked) => {
                    const next = [...options];
                    next[index] = { ...next[index], requiresDetails: checked };
                    onChange(next);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
