// app/admin/layout.tsx

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const ALLOWED_ROLES = ['administrador', 'desenvolvedor', 'suporte'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  const userRoles = session?.user?.roles || [];
  
  // Versão final: com tipo explícito para o TypeScript e segura para execução
  const hasAccess = userRoles.some(
    (role: { id: number; name: string }) => 
      role && role.name && ALLOWED_ROLES.includes(role.name.toLowerCase())
  );

  if (!session?.user || !hasAccess) {
    const redirectUrl = session?.user ? "/portal" : "/login?callbackUrl=/admin";
    redirect(redirectUrl);
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar /> 
      <main className="flex-1 p-8 overflow-y-auto">
        {children} 
      </main>
    </div>
  );
}