import Link from "next/link";
import Image from "next/image";
import { Instagram, Mail, Youtube, Globe, Download, ExternalLink } from "lucide-react";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-muted/20 pt-16 pb-8">
      <div className="container max-w-screen-2xl px-4 md:px-8">

        {/* --- GRID PRINCIPAL --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-16">

          {/* COLUNA 1: Identidade (Ocupa 4 colunas no desktop) */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-block hover:opacity-85 transition-opacity">
              {/* Logo Tema Claro */}
              <div className="relative h-7 w-32 dark:hidden">
                <Image
                  src="/logo/logo-escura.png"
                  alt="Trilink Software"
                  fill
                  className="object-contain object-left"
                  sizes="150px"
                />
              </div>
              {/* Logo Tema Escuro */}
              <div className="relative h-7 w-32 hidden dark:block">
                <Image
                  src="/logo/logo-clara.png"
                  alt="Trilink Software"
                  fill
                  className="object-contain object-left"
                  sizes="150px"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Soluções robustas para gestão empresarial. Simplificando processos, garantindo compliance e conectando resultados.
            </p>
          </div>

          {/* COLUNA 2: Acesso Rápido (2 colunas) */}
          <div className="md:col-span-2 md:col-start-6 flex flex-col gap-4">
            <h4 className="font-semibold text-sm tracking-wide text-foreground">Acesso Rápido</h4>
            <ul className="space-y-3">
              <li>
                <FooterLink href="https://www.trilink.com.br/" external>
                  <Globe className="h-3.5 w-3.5 mr-2" /> Site Institucional
                </FooterLink>
              </li>
              <li>
                <FooterLink href="https://www.trilink.com.br/public/downloads" external>
                  <Download className="h-3.5 w-3.5 mr-2" /> Área de Downloads
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/login">Portal do Cliente</FooterLink>
              </li>
            </ul>
          </div>

          {/* COLUNA 3: Suporte (3 colunas) */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="font-semibold text-sm tracking-wide text-foreground">Suporte</h4>
            <ul className="space-y-3">
              <li><FooterLink href="/docs/manual">Documentação Oficial</FooterLink></li>
              <li><FooterLink href="/docs/duvidas">Dúvidas Frequentes</FooterLink></li>
              <li><FooterLink href="/docs/suporte">Abrir Chamado</FooterLink></li>
              <li><FooterLink href="/status">Status do Sistema</FooterLink></li>
            </ul>
          </div>

          {/* COLUNA 4: Legal (3 colunas) */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="font-semibold text-sm tracking-wide text-foreground">Legal</h4>
            <ul className="space-y-3">
              <li><FooterLink href="/termos">Termos de Uso</FooterLink></li>
              <li><FooterLink href="/privacidade">Política de Privacidade</FooterLink></li>
              <li><FooterLink href="/compliance">Compliance</FooterLink></li>
            </ul>
          </div>

        </div>

        {/* --- RODAPÉ INFERIOR --- */}
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            &copy; {currentYear} Trilink Software Ltda. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4">
            <SocialButton href="https://youtube.com/@trilink" icon={Youtube} label="YouTube" hoverColor="hover:text-red-500" />
            <SocialButton href="https://instagram.com/trilink" icon={Instagram} label="Instagram" hoverColor="hover:text-pink-500" />
            <SocialButton href="mailto:contato@trilink.com.br" icon={Mail} label="Email" hoverColor="hover:text-primary" />
          </div>
        </div>

      </div>
    </footer>
  );
}

/* =======================================================
   COMPONENTES AUXILIARES
   Reduzem a repetição e padronizam o estilo
======================================================= */

function FooterLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center group w-fit"
    >
      {children}
      {external && <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Link>
  );
}

function SocialButton({ href, icon: Icon, label, hoverColor }: { href: string; icon: any; label: string; hoverColor: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`p-2 rounded-full bg-background border border-border/50 text-muted-foreground transition-all hover:scale-110 hover:border-border ${hoverColor}`}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}