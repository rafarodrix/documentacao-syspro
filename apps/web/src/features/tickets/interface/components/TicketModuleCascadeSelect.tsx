"use client";

import type { TicketModuleSettingsOption } from "@dosc-syspro/contracts/ticket";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTicketModuleCascadeState, resolveTicketModuleValueFromCascade } from "@/features/tickets/interface/lib/ticket-module-hierarchy";

type TicketModuleCascadeSelectProps = {
  options: TicketModuleSettingsOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  labels?: {
    module?: string;
    submodule?: string;
    screen?: string;
  };
  compact?: boolean;
};

export function TicketModuleCascadeSelect({
  options,
  value,
  onChange,
  disabled,
  labels,
  compact = false,
}: TicketModuleCascadeSelectProps) {
  const state = getTicketModuleCascadeState(options, value);
  const triggerClassName = compact ? "h-9" : "h-10";

  const handleModuleChange = (module: string) => {
    onChange(resolveTicketModuleValueFromCascade(options, { module }));
  };

  const handleSubmoduleChange = (submodule: string) => {
    onChange(resolveTicketModuleValueFromCascade(options, { module: state.selectedModule, submodule }));
  };

  const handleScreenChange = (screen: string) => {
    onChange(
      resolveTicketModuleValueFromCascade(options, {
        module: state.selectedModule,
        submodule: state.selectedSubmodule,
        screen,
      }),
    );
  };

  return (
    <div className="grid gap-3">
      <CascadeSelectField
        label={labels?.module ?? "Modulo"}
        value={state.selectedModule}
        options={state.modules}
        placeholder="Selecione o modulo"
        onChange={handleModuleChange}
        disabled={disabled || state.modules.length === 0}
        triggerClassName={triggerClassName}
      />

      <CascadeSelectField
        label={labels?.submodule ?? "Submodulo"}
        value={state.selectedSubmodule}
        options={state.submodules}
        placeholder="Selecione o submodulo"
        onChange={handleSubmoduleChange}
        disabled={disabled || state.submodules.length === 0}
        triggerClassName={triggerClassName}
      />

      <CascadeSelectField
        label={labels?.screen ?? "Tela"}
        value={state.selectedScreen}
        options={state.screens}
        placeholder="Selecione a tela"
        onChange={handleScreenChange}
        disabled={disabled || state.screens.length === 0}
        triggerClassName={triggerClassName}
      />
    </div>
  );
}

function CascadeSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
  triggerClassName,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  triggerClassName: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
