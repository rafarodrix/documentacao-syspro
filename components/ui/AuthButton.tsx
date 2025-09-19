'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  // Mostra um estado de carregamento enquanto a sessão é verificada
  if (status === 'loading') {
    return <button disabled className="text-sm font-medium text-muted-foreground">Carregando...</button>;
  }

  // Se o usuário estiver logado, mostra o nome e o botão de sair
  if (session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="text-sm">{session.user?.name}</span>
        <button 
          onClick={() => signOut()} 
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </div>
    );
  }

  // Se não estiver logado, mostra o botão de entrar
  return (
    <button 
      onClick={() => signIn('zammad')} 
      className="text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      Entrar com Zammad
    </button>
  );
}