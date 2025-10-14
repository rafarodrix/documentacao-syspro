import { getSqlScripts } from '@/lib/scripts';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default function AdminDashboardPage() {
  // 1. Busca os dados no servidor.
  const scripts = getSqlScripts();

  return (
    // 2. Passa os dados para o componente de cliente.
    <AdminDashboardClient initialScripts={scripts} />
  );
}