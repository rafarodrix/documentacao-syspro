"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";

type IdentityHost = RemoteHostDetails["host"];
type CompanyOption = RemoteHostDetails["companyOptions"][number];

export function useHostIdentityDraft({
  host,
  companyOptions,
  agentRustdeskId,
  agentMachineName,
  openOnMount = false,
}: {
  host: IdentityHost;
  companyOptions: CompanyOption[];
  agentRustdeskId: string | null;
  agentMachineName: string | null;
  openOnMount?: boolean;
}) {
  const router = useRouter();
  const [projectedHostName, setProjectedHostName] = useState(host.name);
  const [projectedCompanyId, setProjectedCompanyId] = useState(host.companyId ?? companyOptions[0]?.id ?? "");
  const [projectedMachineProfile, setProjectedMachineProfile] = useState<IdentityHost["machineProfile"]>(
    host.machineProfile,
  );
  const [projectedNotes, setProjectedNotes] = useState(host.notes ?? "");
  const [identitySheetOpen, setIdentitySheetOpen] = useState(openOnMount);
  const [showCompanyChangeConfirm, setShowCompanyChangeConfirm] = useState(false);
  const [isSavingMachineName, startSavingMachineName] = useTransition();

  useEffect(() => {
    setProjectedHostName(host.name);
  }, [host.name]);

  useEffect(() => {
    setProjectedCompanyId(host.companyId ?? companyOptions[0]?.id ?? "");
  }, [companyOptions, host.companyId]);

  useEffect(() => {
    setProjectedMachineProfile(host.machineProfile);
  }, [host.machineProfile]);

  useEffect(() => {
    setProjectedNotes(host.notes ?? "");
  }, [host.notes]);

  useEffect(() => {
    if (openOnMount) setIdentitySheetOpen(true);
  }, [openOnMount]);

  const normalizedProjectedHostName = projectedHostName.trim();
  const normalizedProjectedNotes = projectedNotes.trim();
  const canSaveProjectedHostName =
    (normalizedProjectedHostName.length > 0 && normalizedProjectedHostName !== host.name.trim()) ||
    projectedCompanyId !== host.companyId ||
    projectedMachineProfile !== host.machineProfile ||
    normalizedProjectedNotes !== (host.notes?.trim() ?? "");

  async function persistProjectedDeviceIdentity() {
    await requestRemoteMutation({
      url: `/api/remote/hosts/${host.id}`,
      method: "PATCH",
      body: {
        companyId: projectedCompanyId,
        name: normalizedProjectedHostName,
        machineName: agentMachineName,
        machineProfile: projectedMachineProfile,
        environment: null,
        provider: host.provider,
        description: host.description,
        notes: normalizedProjectedNotes || null,
        agentExternalId: agentRustdeskId,
        status: host.status,
      },
    });
    toast.success("Dispositivo atualizado.");
    setShowCompanyChangeConfirm(false);
    setIdentitySheetOpen(false);
    router.refresh();
  }

  function handleSaveProjectedHostName() {
    if (!normalizedProjectedHostName) {
      toast.error("Informe um nome amigável válido para o dispositivo.");
      return;
    }
    if (!projectedCompanyId) {
      toast.error("Selecione a empresa principal do dispositivo.");
      return;
    }
    if (projectedCompanyId !== host.companyId) {
      setShowCompanyChangeConfirm(true);
      return;
    }
    startSavingMachineName(async () => {
      try {
        await persistProjectedDeviceIdentity();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function confirmCompanyChange() {
    startSavingMachineName(async () => {
      try {
        await persistProjectedDeviceIdentity();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function openIdentityEditor() {
    setIdentitySheetOpen(true);
  }

  return {
    projectedHostName,
    setProjectedHostName,
    projectedCompanyId,
    setProjectedCompanyId,
    projectedMachineProfile,
    setProjectedMachineProfile,
    projectedNotes,
    setProjectedNotes,
    canSaveProjectedHostName,
    isSavingMachineName,
    identitySheetOpen,
    setIdentitySheetOpen,
    openIdentityEditor,
    showCompanyChangeConfirm,
    setShowCompanyChangeConfirm,
    handleSaveProjectedHostName,
    confirmCompanyChange,
  };
}
