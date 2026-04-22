import './globals.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { ThemeProvider } from '@/providers/theme-provider';

const inter = Inter({
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={inter.className}
    >
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Script id="chatwoot-settings" strategy="afterInteractive">
          {`
            window.chatwootSettings = { position: 'right', type: 'standard', launcherTitle: '' };
          `}
        </Script>
        <Script id="chatwoot-sdk" strategy="afterInteractive">
          {`
            (function(d, t) {
              if (window.chatwootSDK) return;
              var BASE_URL = 'https://chat.trilinksoftware.com.br';
              var g = d.createElement(t), s = d.getElementsByTagName(t)[0];
              g.src = BASE_URL + '/packs/js/sdk.js';
              g.async = true;
              s.parentNode.insertBefore(g, s);
              g.onload = function() {
                if (!window.chatwootSDK) return;
                window.chatwootSDK.run({
                  websiteToken: 'FDDWn82o1Q7Yfs2czgx9dfWJ',
                  baseUrl: BASE_URL
                });
              };
            })(document, 'script');
          `}
        </Script>
      </body>
    </html>
  );
}
