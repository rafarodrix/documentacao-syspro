"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@dosc-syspro/ui";
import type { RemoteMachineProfile } from "@dosc-syspro/contracts/remote";
import { MACHINE_PROFILE_LABEL } from "@/features/remote/interface/host-details/host-details.constants";
import { SearchableCompanyPicker } from "@/features/remote/interface/host-details/components/searchable-company-picker";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";
import { deviceManagedDetailPath } from "../domain/device-detail-paths";

type CompanyOption = { id: string; label: string; searchText?: string };

type CreateDeviceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyOptions: CompanyOption[];
  initialCompanyId?: string;
};

type CreatedHost = { id: string };

export function CreateDeviceSheet({
  open,
  onOpenChange,
  companyOptions,
  initialCompanyId,
}: CreateDeviceSheetProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId ?? companyOptions[0]?.id ?? "");
  const [machineProfile, setMachineProfile] = useState<RemoteMachineProfile | null>(null);
  const [notes, setNotes] = useState("");
  const [rustdeskId, setRustdeskId] = useState("");
  const [isCreating, startCreating] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName("");
    setCompanyId(initialCompanyId ?? companyOptions[0]?.id ?? "");
    setMachineProfile(null);
    setNotes("");
    setRustdeskId("");
  }, [open, initialCompanyId, companyOptions]);

  const canSubmit = name.trim().length > 0 && companyId.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Informe o nome e a empresa do dispositivo.");
      return;
    }

    startCreating(async () => {
      try {
        const result = await requestRemoteMutation<CreatedHost>({
          url: "/api/remote/hosts",
          method: "POST",
          body: {
            companyId: companyId.trim(),
            name: name.trim(),
            machineProfile,
            notes: notes.trim() || null,
            agentExternalId: rustdeskId.trim() || null,
            provider: "RustDesk",
          },
        });

        toast.success(result.message ?? "Dispositivo cadastrado.");
        onOpenChange(false);
        router.push(deviceManagedDetailPath(result.data.id));
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Adicionar dispositivo</SheetTitle>
          <SheetDescription>
            Cadastro manual de um dispositivo gerenciado. Prefira vincular uma descoberta quando o agente já estiver
            reportando.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Nome amigável</p>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Servidor principal"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Empresa</p>
            <SearchableCompanyPicker
              value={companyId}
              options={companyOptions}
              onChange={setCompanyId}
              disabled={isCreating}
              hideUnlinked
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Função atribuída</p>
            <Select
              value={machineProfile ?? "__none__"}
              onValueChange={(value) => setMachineProfile(value === "__none__" ? null : (value as RemoteMachineProfile))}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não definido (coleta leve de estação)</SelectItem>
                {Object.entries(MACHINE_PROFILE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">ID RustDesk (opcional)</p>
            <Input
              value={rustdeskId}
              onChange={(event) => setRustdeskId(event.target.value)}
              placeholder="123 456 789"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Observações</p>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anotações operacionais sobre este dispositivo."
              rows={4}
              disabled={isCreating}
            />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isCreating}>
            {isCreating ? "Cadastrando..." : "Cadastrar dispositivo"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type CreateDeviceSheetFromUrlProps = {
  companyOptions: CompanyOption[];
  canManage: boolean;
  initialCompanyId?: string;
};

/** Opens when `newHost=true` is present and clears the query param on close. */
export function CreateDeviceSheetFromUrl({
  companyOptions,
  canManage,
  initialCompanyId,
}: CreateDeviceSheetFromUrlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wantsCreate = canManage && searchParams.get("newHost") === "true";
  const [open, setOpen] = useState(wantsCreate);

  useEffect(() => {
    setOpen(wantsCreate && companyOptions.length > 0);
  }, [wantsCreate, companyOptions.length]);

  useEffect(() => {
    if (!wantsCreate || companyOptions.length > 0) return;
    toast.error("Nenhuma empresa disponível para cadastrar o dispositivo.");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("newHost");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [wantsCreate, companyOptions.length, pathname, router, searchParams]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("newHost");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  if (!canManage) {
    return null;
  }

  if (companyOptions.length === 0) {
    return null;
  }

  return (
    <CreateDeviceSheet
      open={open}
      onOpenChange={handleOpenChange}
      companyOptions={companyOptions}
      initialCompanyId={initialCompanyId}
    />
  );
}
