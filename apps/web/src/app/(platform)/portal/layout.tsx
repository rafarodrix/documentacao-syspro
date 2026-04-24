import { type ReactNode } from "react"
import { PortalShellLayout } from "@/components/platform/app/layout/PortalShellLayout"

export default async function AppLayout({ children }: { children: ReactNode }) {
  return <PortalShellLayout>{children}</PortalShellLayout>
}
