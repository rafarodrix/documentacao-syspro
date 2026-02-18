'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function NavTitle() {
  const { theme } = useTheme();
  const [logoSrc, setLogoSrc] = useState('/logo/logo-escura.png');

  useEffect(() => {
    setLogoSrc(theme === 'dark' ? '/logo/logo-clara.png' : '/logo/logo-escura.png');
  }, [theme]);

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