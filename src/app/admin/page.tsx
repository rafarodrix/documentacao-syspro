// app/admin/page.tsx

import { Suspense } from 'react';
import { getSqlScripts } from '@/lib/scripts';
import { getAdminDashboardStats } from '@/lib/stats';
import { AdminDashboardClient, DashboardSkeleton } from '@/components/admin/AdminDashboardClient';


export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardDataFetcher />
    </Suspense>
  );
}

// Componente que busca os dados no servidor e passa para o cliente
async function DashboardDataFetcher() {
  const [stats, scripts] = await Promise.all([
    getAdminDashboardStats(),
    getSqlScripts(),
  ]);

  return (
    <AdminDashboardClient stats={stats} initialScripts={scripts} />
  );
}