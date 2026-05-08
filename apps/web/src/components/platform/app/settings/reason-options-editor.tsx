"use client";

import { Input } from "@dosc-syspro/ui";
import { Label } from "@dosc-syspro/ui";
import { Switch } from "@/components/ui/switch";

type ReasonOption = {
  key: string;
  label: string;
  isActive?: boolean;
  requiresDetails?: boolean;
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
  const updateOption = (index: number, updater: (current: T) => T) => {
    const next = options.map((option, optionIndex) => {
      if (optionIndex !== index) return option;
      return updater(option);
    });

    onChange(next);
  };

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
                onChange={(event) =>
                  updateOption(index, (current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Ativo</p>
                  <p className="text-[11px] text-muted-foreground">Exibir no modulo</p>
                </div>
                <Switch
                  checked={Boolean(reason.isActive)}
                  onCheckedChange={(checked) =>
                    updateOption(index, (current) => ({
                      ...current,
                      isActive: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Exigir detalhes</p>
                  <p className="text-[11px] text-muted-foreground">Campo complementar obrigatorio</p>
                </div>
                <Switch
                  checked={Boolean(reason.requiresDetails)}
                  onCheckedChange={(checked) =>
                    updateOption(index, (current) => ({
                      ...current,
                      requiresDetails: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
