import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import ZammadChat from '@/components/ZammadChat'; 
import { NextAuthProvider } from "./providers"; // Você já importou corretamente

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
        
        {/* Sua implementação do ZammadChat já está correta e pode continuar aqui. */}
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
          <ZammadChat
            scriptSrc="https://suporte.trilinksoftware.com.br/assets/chat/chat-no-jquery.min.js"
            chatOptions={{
              title: 'Chat de Suporte',
              fontSize: '11px',
              chatId: 1,
              show: false,
              locale: "pt-br",
            }}
            buttonText="Posso Ajudar?"
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          />
        </div>
      </body>
    </html>
  );
}