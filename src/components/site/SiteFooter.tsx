import Link from "next/link";
import Image from "next/image";
import { Instagram, Mail, Youtube, Globe, Download } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30 pt-16 pb-8">
      <div className="container px-4 md:px-6">

        {/* --- PARTE SUPERIOR: Grid de Links e Logo --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

          {/* Coluna 1: Marca e Descrição */}
          <div className="col-span-1 md:col-span-1 space-y-4">
            <Link href="/" className="inline-block">
              {/* Logo Tema Claro */}
              <div className="relative h-7 w-auto dark:hidden">
                <Image
                  src="/logo/logo-escura.png"
                  alt="Trilink Software"
                  width={120}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </div>
              {/* Logo Tema Escuro */}
              <div className="relative h-7 w-auto hidden dark:block">
                <Image
                  src="/logo/logo-clara.png"
                  alt="Trilink Software"
                  width={120}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Soluções robustas para gestão empresarial. Simplificando processos e conectando resultados.
            </p>
          </div>

          {/* Coluna 2: Acesso Rápido (Links Externos Reais) */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm text-foreground">Acesso Rápido</h4>

            <Link
              href="https://www.trilink.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Globe className="h-3 w-3" /> Site Institucional
            </Link>

            <Link
              href="https://www.trilink.com.br/public/downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Download className="h-3 w-3" /> Área de Downloads
            </Link>

            <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Portal do Cliente (Login)
            </Link>
          </div>

          {/* Coluna 3: Suporte (Links Internos) */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm text-foreground">Suporte & Ajuda</h4>
            <Link href="/docs/manual" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Documentação Oficial
            </Link>
            <Link href="/docs/duvidas" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Dúvidas Frequentes
            </Link>
            <Link href="/docs/suporte" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Suporte
            </Link>
          </div>

          {/* Coluna 4: Legal e Contato */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm text-foreground">Legal</h4>
            <Link href="/termos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacidade
            </Link>
          </div>
        </div>

        {/* --- PARTE INFERIOR: Copyright e Social --- */}
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} Trilink Software. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-6">
            {/* YouTube */}
            <Link
              href="https://www.youtube.com/channel/UCcH7GYfmvIE9_UlWAUH8h2Q"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-red-600 transition-colors"
              title="YouTube Trilink"
            >
              <Youtube className="h-5 w-5" />
              <span className="sr-only">YouTube</span>
            </Link>

            {/* Instagram */}
            <Link
              href="https://www.instagram.com/trilinksoftwares"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-pink-600 transition-colors"
              title="Instagram Trilink"
            >
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </Link>

            {/* Email (Genérico, ajuste se tiver um específico) */}
            <Link
              href="mailto:contato@trilink.com.br"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="E-mail de Contato"
            >
              <Mail className="h-5 w-5" />
              <span className="sr-only">Email</span>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}