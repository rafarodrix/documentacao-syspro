import { useState } from "react";
import type { TicketModuleStatus, TicketModuleSettings } from "@dosc-syspro/contracts/ticket";

interface UseTicketDetailsWorkflowParams {
  ticketStatus?: string | null;
  ticketSettings: TicketModuleSettings;
  classificationDirty: boolean;
  persistWorkflowChange: (status: TicketModuleStatus, successMessage: string) => void;
}

export function useTicketDetailsWorkflow({
  ticketStatus,
  ticketSettings,
  classificationDirty,
  persistWorkflowChange,
}: UseTicketDetailsWorkflowParams) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [testingReturnOpen, setTestingReturnOpen] = useState(false);

  const changeStatus = (status: TicketModuleStatus) => {
    if (status === "RESOLVED") {
      setFinalizeOpen(true);
      return;
    }
    if (
      status === "IN_PROGRESS" &&
      (ticketStatus || "").toLowerCase().includes("test") &&
      ticketSettings.requireTestingReturnReason
    ) {
      setTestingReturnOpen(true);
      return;
    }
    persistWorkflowChange(
      status,
      classificationDirty ? "Classificacao e estagio atualizados." : "Estagio atualizado."
    );
  };

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    finalizeOpen,
    setFinalizeOpen,
    testingReturnOpen,
    setTestingReturnOpen,
    changeStatus,
  };
}
