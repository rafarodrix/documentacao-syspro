"use client";

import { Input, Label, Switch } from "@dosc-syspro/ui";

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

        {options.map((reason, index) => (
          <div
            key={reason.key}
            className="grid grid-cols-1 gap-4 items-stretch rounded-xl border border-border/40 bg-muted/10 p-3 md:grid-cols-[150px_1fr_auto] lg:grid-cols-[180px_1fr_auto] md:items-center transition-all hover:bg-muted/15"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate" title={reason.key}>
                {reason.key}
              </p>
              <p className="text-[10px] text-muted-foreground">Chave tecnica</p>
            </div>

            <div className="w-full">
              <Input
                id={`${inputPrefix}-${reason.key}`}
                placeholder="Rotulo do motivo"
                value={reason.label}
                className="h-9 border-border/50 bg-background/50 focus:bg-background text-sm"
                onChange={(event) =>
                  updateOption(index, (current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-row flex-wrap items-center gap-2 md:flex-nowrap">
              <div className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 shadow-sm transition-colors hover:bg-background/60">
                <Switch
                  id={`active-${inputPrefix}-${reason.key}`}
                  checked={Boolean(reason.isActive)}
                  onCheckedChange={(checked) =>
                    updateOption(index, (current) => ({
                      ...current,
                      isActive: checked,
                    }))
                  }
                />
                <Label
                  htmlFor={`active-${inputPrefix}-${reason.key}`}
                  className="text-xs font-medium text-foreground cursor-pointer select-none"
                >
                  Ativo
                </Label>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 shadow-sm transition-colors hover:bg-background/60">
                <Switch
                  id={`details-${inputPrefix}-${reason.key}`}
                  checked={Boolean(reason.requiresDetails)}
                  onCheckedChange={(checked) =>
                    updateOption(index, (current) => ({
                      ...current,
                      requiresDetails: checked,
                    }))
                  }
                />
                <Label
                  htmlFor={`details-${inputPrefix}-${reason.key}`}
                  className="text-xs font-medium text-foreground cursor-pointer select-none"
                >
                  Exigir detalhes
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>
  );
}
