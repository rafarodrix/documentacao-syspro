"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";

export function useIsMobileClient() {
  const [isMobileClient, setIsMobileClient] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
  }, []);

  return isMobileClient;
}

export function normalizeRustDeskId(value: string | null | undefined) {
  return value?.replace(/\s+/g, "").trim() ?? "";
}

export function buildRustDeskHref(externalId: string, isMobileClient: boolean) {
  const normalized = normalizeRustDeskId(externalId);
  if (!normalized) return null;
  return isMobileClient ? `rustdesk://[${normalized}]` : `rustdesk://${normalized}`;
}

export function launchRustDesk(externalId: string, isMobileClient: boolean) {
  const href = buildRustDeskHref(externalId, isMobileClient);
  if (!href) return false;
  window.location.href = href;
  return true;
}

type ConnectInput = {
  externalId: string | null | undefined;
  /** When set, registers an audited portal session after launching the protocol. */
  hostId?: string;
  companyId?: string | null;
  ticketNumber?: string | null;
  reason?: string;
  emptyError?: string;
  /** Discovered machines open RustDesk without portal session audit. */
  audit?: boolean;
};

export function useRustDeskConnect() {
  const isMobileClient = useIsMobileClient();
  const [isConnecting, startConnecting] = useTransition();

  const connect = useCallback(
    (input: ConnectInput) => {
      const normalized = normalizeRustDeskId(input.externalId);
      if (!normalized) {
        toast.error(input.emptyError ?? "Dispositivo sem ID remoto. Não é possível iniciar a sessão.");
        return false;
      }

      const launched = launchRustDesk(normalized, isMobileClient);
      if (!launched) return false;

      const shouldAudit = input.audit !== false && Boolean(input.hostId);
      if (!shouldAudit || !input.hostId) {
        return true;
      }

      startConnecting(async () => {
        try {
          const result = await requestRemoteSessionAction({
            hostId: input.hostId!,
            companyId: input.companyId || undefined,
            ticketNumber: input.ticketNumber || undefined,
            reason:
              input.reason ??
              (input.ticketNumber
                ? `Suporte via Portal para Ticket #${input.ticketNumber}`
                : "Acesso técnico via Portal"),
          });
          if (!result.success) {
            toast.error(result.error ?? "Falha ao registrar a sessão auditada.");
          }
        } catch {
          // Protocol already opened; audit failure is non-blocking.
        }
      });

      return true;
    },
    [isMobileClient],
  );

  return {
    isMobileClient,
    isConnecting,
    connect,
  };
}
