// 1. OBRIGATÓRIO: Define este como um Componente de Cliente
'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function NavTitle() {
  // 2. Estado para saber se o componente já "montou" no navegador
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme(); // Usar 'resolvedTheme' é mais seguro
  
  // 3. Efeito que roda apenas uma vez no cliente para indicar que está montado
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determina a fonte da logo com base no tema
  const logoSrc = resolvedTheme === 'dark' ? '/logo/logo-clara.png' : '/logo/logo-escura.png';

  // 4. Se o componente ainda não montou no cliente, não renderiza a imagem ainda
  // Isso evita o erro de hidratação entre servidor e cliente.
  if (!isMounted) {
    // Pode retornar null ou um placeholder para evitar "pulos" no layout
    return <div style={{ width: '128px', height: '32px' }} />;
  }

  return (
    <Image
      src={logoSrc}
      alt="Logo Trilink Software"
      width={128}
      height={32} 
      priority 
      className="h-8 w-auto" 
    />
  );
}