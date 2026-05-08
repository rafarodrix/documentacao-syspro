"use client";

import { createContext, useContext } from "react";
import type { ChatwootDashboardState } from "./chatwoot-dashboard-types";

export const ChatwootDashboardContext = createContext<ChatwootDashboardState | null>(null);

export function useChatwootDashboard(): ChatwootDashboardState {
  const context = useContext(ChatwootDashboardContext);
  if (!context) {
    throw new Error("useChatwootDashboard must be used within ChatwootDashboardContext.Provider");
  }
  return context;
}
