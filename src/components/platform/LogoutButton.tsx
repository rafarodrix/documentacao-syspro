'use client'; 

import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // 1. Limpa o cookie de sessão via API
      await authClient.signOut();
      
      // 2. Redireciona (Hard refresh é melhor para garantir o middleware)
      window.location.href = '/login'; 
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Falha ao desconectar.");
    }
  };

  return (
    <Button 
      variant="ghost" // Use 'ghost' ou 'outline' para ser discreto
      size="icon" 
      title="Sair do Portal"
      onClick={handleLogout}
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}