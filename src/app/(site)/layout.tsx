import { SiteHeader } from "@/components/site/Header";
import { SiteFooter } from "@/components/site/SiteFooter";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    // min-h-screen: Garante altura total da janela
    // overflow-x-hidden: Evita scroll lateral causado por animações de entrada
    // selection: Padroniza a cor de seleção de texto em todo o site
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased overflow-x-hidden selection:bg-primary/20 selection:text-primary">

      {/* Header Fixo/Sticky */}
      <SiteHeader />

      {/* Conteúdo Principal */}
      {/* flex-1: Empurra o footer para baixo */}
      {/* relative: Cria contexto de empilhamento para filhos absolutos */}
      <main className="flex-1 relative">
        {children}
      </main>

      {/* Footer */}
      <SiteFooter />

    </div>
  );
}