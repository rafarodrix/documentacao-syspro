import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession } from '@/lib/auth-helpers';

export default async function PlatformRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 1. Apenas verifica se está autenticado
  const session = await getProtectedSession();

  if (!session) {
    redirect('/login');
  }

  // 2. Renderiza o filho (que será o layout do admin ou do client)
  return (
    <>
      {children}
    </>
  );
}