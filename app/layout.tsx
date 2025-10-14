import './globals.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { NextAuthProvider } from "./providers";
import { ConditionalChat } from '@/components/chat/ConditionalChat';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <NextAuthProvider>
          <RootProvider>{children}</RootProvider>
        </NextAuthProvider>
        

        <ConditionalChat />
      </body>
    </html>
  );
}