import { type ReactNode } from "react"
import { PortalShellLayout } from "@/components/platform/app/layout/portal-shell-layout"

export default async function AppLayout({ children }: { children: ReactNode }) {
  return <PortalShellLayout>{children}</portal-shell-layout>
}
