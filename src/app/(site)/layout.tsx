import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    // min-h-screen garante que o footer vá para o fundo mesmo com pouco conteúdo
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased">
      
      {/* Header Fixo */}
      <SiteHeader />

      {/* Conteúdo Principal */}
      {/* flex-1 faz esta div crescer para ocupar todo o espaço disponível */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <SiteFooter />
      
    </div>
  );
}