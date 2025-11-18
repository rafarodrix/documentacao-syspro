// app/admin/layout.tsx

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/src/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const ALLOWED_ROLES = ['administrador', 'desenvolvedor', 'suporte'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  console.log("SESSÃO SENDO VERIFICADA NO ADMIN LAYOUT:", JSON.stringify(session, null, 2));

  const userRoles = session?.user?.roles || [];
  
// Verifica se o usuário tem pelo menos um dos papéis permitidos
  const hasAccess = userRoles.some(
    (role: { id: number; name: string }) => 
      role && role.name && ALLOWED_ROLES.includes(role.name.toLowerCase())
  );
// Redireciona se não estiver autenticado ou não tiver o papel adequado
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