"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

interface PortalShellMode {
  showSidebar: boolean
}

interface PortalShellModeContextValue {
  mode: PortalShellMode
  setMode: (next: PortalShellMode) => void
}

const DEFAULT_MODE: PortalShellMode = { showSidebar: true }

const PortalShellModeContext = createContext<PortalShellModeContextValue | null>(null)

export function PortalShellModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PortalShellMode>(DEFAULT_MODE)
  const value = useMemo(() => ({ mode, setMode }), [mode])

  return <PortalShellModeContext.Provider value={value}>{children}</PortalShellModeContext.Provider>
}

export function usePortalShellMode() {
  const context = useContext(PortalShellModeContext)

  if (!context) {
    throw new Error("usePortalShellMode must be used within PortalShellModeProvider")
  }

  return context
}

export function PortalShellModeController({ showSidebar }: { showSidebar: boolean }) {
  const { setMode } = usePortalShellMode()

  useEffect(() => {
    setMode({ showSidebar })

    return () => {
      setMode(DEFAULT_MODE)
    }
  }, [setMode, showSidebar])

  return null
}
