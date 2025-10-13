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

  // 1. Define o prefixo do caminho apenas se estiver em produção.
  const basePath = process.env.NODE_ENV === 'production' ? '/ajuda' : '';

  // 2. Monta a URL completa da imagem, incluindo o basePath.
  const logoSrc = resolvedTheme === 'dark' 
    ? `${basePath}/logo/logo-clara.png` 
    : `${basePath}/logo/logo-escura.png`;

  if (!isMounted) {
    return <div style={{ width: '128px', height: '32px' }} />;
  }

  // Renderiza a imagem da logo com as propriedades ajustadas
   return (
    <Image
      src={logoSrc}
      alt="Logo Trilink Software"
      width={128}
      height={32} 
      priority 
      className="h-8 w-auto"
      unoptimized 
    />
  );
}