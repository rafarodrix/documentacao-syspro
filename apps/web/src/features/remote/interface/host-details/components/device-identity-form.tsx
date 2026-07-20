"use client";

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { MACHINE_PROFILE_LABEL } from "../host-details.constants";
import { SearchableCompanyPicker } from "./searchable-company-picker";

type Props = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  primaryCompanyId: string;
  onPrimaryCompanyIdChange: (value: string) => void;
  companyOptions: Array<{ id: string; label: string; searchText?: string }>;
  hostname: string | null;
  machineProfile: RemoteHostDetails["host"]["machineProfile"];
  onMachineProfileChange: (value: RemoteHostDetails["host"]["machineProfile"]) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  disabled?: boolean;
};

export function DeviceIdentityForm({
  displayName,
  onDisplayNameChange,
  primaryCompanyId,
  onPrimaryCompanyIdChange,
  companyOptions,
  hostname,
  machineProfile,
  onMachineProfileChange,
  notes,
  onNotesChange,
  disabled,
}: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Nome amigável</p>
        <Input
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Servidor principal"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Empresa principal</p>
        <SearchableCompanyPicker
          value={primaryCompanyId}
          options={companyOptions}
          onChange={onPrimaryCompanyIdChange}
          disabled={disabled}
          hideUnlinked
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Hostname</p>
        <div className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5">
          <p className="font-mono text-sm text-foreground">{hostname ?? "Não informado"}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Detectado automaticamente pelo agente.</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Função atribuída</p>
        <Select
          value={machineProfile ?? "__none__"}
          onValueChange={(value) => onMachineProfileChange(value === "__none__" ? null : (value as RemoteHostDetails["host"]["machineProfile"]))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Não definido</SelectItem>
            {Object.entries(MACHINE_PROFILE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <p className="text-xs font-medium text-muted-foreground">Observações</p>
        <Textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Anotações operacionais sobre este dispositivo."
          rows={4}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
