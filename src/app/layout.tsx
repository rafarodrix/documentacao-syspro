
import './globals.css'; 
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers'; 
import { ConditionalChat } from '@/components/chat/ConditionalChat';

const inter = Inter({
  subsets: ['latin'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
        <ConditionalChat />
      </body>
    </html>
  );
}