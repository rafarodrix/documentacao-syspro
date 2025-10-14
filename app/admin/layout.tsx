// app/admin/layout.tsx

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "../../components/admin/AdminSidebar";


const ALLOWED_ROLES = ['administrador', 'desenvolvedor', 'suporte'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  const userRoles = session?.user?.roles || [];
  
  const hasAccess = userRoles.some(
    (role: { name: string }) => ALLOWED_ROLES.includes(role.name.toLowerCase())
  );

  // Redirecionamento se o usuário não estiver logado OU não tiver acesso, ele é redirecionado.
  if (!session?.user || !hasAccess) {
    // Se não estiver logado, vai para o login. Se estiver, mas sem permissão, vai para o portal.
    const redirectUrl = session?.user ? "/portal" : "/login?callbackUrl=/admin";
    redirect(redirectUrl);
  }

  // Se passou pelas verificações, renderiza o layout de admin.
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar /> 
      <main className="flex-1 p-8 overflow-y-auto">
        {children} 
      </main>
    </div>
  );
}