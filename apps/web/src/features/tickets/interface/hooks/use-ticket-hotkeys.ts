"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const TicketHotkeys = {
  GLOBAL_SEARCH: "meta+k",
  NEW_TICKET: "n",
  REPLY: "r",
  ASSIGN_TO_ME: "a",
  CHANGE_STATUS: "s",
  ADD_INTERNAL_NOTE: "i",
};

interface UseTicketHotkeysProps {
  onSearch?: () => void;
  onReply?: () => void;
  onAssignToMe?: () => void;
  onChangeStatus?: () => void;
  onAddInternalNote?: () => void;
}

export function useTicketHotkeys({
  onSearch,
  onReply,
  onAssignToMe,
  onChangeStatus,
  onAddInternalNote,
}: UseTicketHotkeysProps = {}) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if the user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        // Allow Meta+K even if focused somewhere else?
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          onSearch?.();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearch?.();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          router.push("/portal/tickets/novo");
          break;
        case "r":
          e.preventDefault();
          onReply?.();
          break;
        case "a":
          e.preventDefault();
          onAssignToMe?.();
          break;
        case "s":
          e.preventDefault();
          onChangeStatus?.();
          break;
        case "i":
          e.preventDefault();
          onAddInternalNote?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, onSearch, onReply, onAssignToMe, onChangeStatus, onAddInternalNote]);
}
