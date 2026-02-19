import { redirect } from "next/navigation"
import { type ReactNode } from "react"
import { getProtectedSession } from "@/lib/auth-helpers"
import { AppSidebar } from "@/components/platform/app/layout/app-sidebar"
import { MobileHeader } from "@/components/platform/app/layout/MobileHeader"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getProtectedSession()

  if (!session) redirect("/login")

  const user = {
    name: session.name ?? session.email.split("@")[0] ?? "Usuário",
    email: session.email,
    image: session.image ?? null,
    role: session.role,
  }

  return (
    <div className="flex h-screen w-full bg-muted/5 overflow-hidden">
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r bg-background">
        <AppSidebar user={user} />
      </aside>

      <div className="flex-1 flex flex-col md:pl-72 h-full">
        <MobileHeader user={user} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}