import './globals.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { RootProvider } from 'fumadocs-ui/provider';

const inter = Inter({
  subsets: ['latin'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-background text-foreground">
        <RootProvider>
          <Providers>
            {children}
          </Providers>
        </RootProvider>
      </body>
    </html>
  );
}