// src/components/NavTitle.tsx
'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function NavTitle() {
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  
  // Efeito que roda apenas uma vez no cliente para indicar que o componente "montou"
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determina a fonte da logo com base no tema resolvido
  const logoSrc = resolvedTheme === 'dark' ? '/logo/logo-clara.png' : '/logo/logo-escura.png';

  // Enquanto não estiver montado, renderiza um placeholder para evitar erro de hidratação
  if (!isMounted) {
    // Placeholder com as mesmas dimensões da imagem para evitar "pulos" no layout
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