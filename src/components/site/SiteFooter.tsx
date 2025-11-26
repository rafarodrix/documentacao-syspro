import Link from "next/link";
import Image from "next/image";
import { Instagram, Mail, Youtube, Globe, Download, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background pt-16 pb-8 relative overflow-hidden">

      {/* Background Grids (Sutil) */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)"></div>

      <div className="container max-w-screen-2xl px-4 md:px-8 relative z-10">

        {/* --- GRID PRINCIPAL --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-16">

          {/* COLUNA 1: Identidade (Ocupa 4 colunas no desktop) */}
          <div className="md:col-span-4 space-y-6">
            <Link href="/" className="inline-block hover:opacity-85 transition-opacity">
              {/* Logo Tema Claro */}
              <div className="relative h-8 w-36 dark:hidden">
                <Image
                  src="/logo/logo-escura.png"
                  alt="Trilink Software"
                  fill
                  className="object-contain object-left"
                  sizes="150px"
                />
              </div>
              {/* Logo Tema Escuro */}
              <div className="relative h-8 w-36 hidden dark:block">
                <Image
                  src="/logo/logo-clara.png"
                  alt="Trilink Software"
                  fill
                  className="object-contain object-left"
                  sizes="150px"
                />
              </div>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Soluções robustas para gestão empresarial. Simplificando processos, garantindo compliance e conectando resultados para impulsionar o seu negócio.
            </p>

            {/* Botões Sociais */}
            <div className="flex items-center gap-2">
              <SocialButton href="https://www.youtube.com/channel/UCcH7GYfmvIE9_UlWAUH8h2Q" icon={Youtube} label="YouTube" hoverColor="hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5" />
              <SocialButton href="https://www.instagram.com/trilinksoftwares" icon={Instagram} label="Instagram" hoverColor="hover:text-pink-500 hover:border-pink-500/20 hover:bg-pink-500/5" />
              <SocialButton href="mailto:trilinksuporte@gmail.com" icon={Mail} label="Email" hoverColor="hover:text-primary hover:border-primary/20 hover:bg-primary/5" />
            </div>
          </div>

          {/* COLUNA 2: Acesso Rápido */}
          <div className="md:col-span-2 md:col-start-6 flex flex-col gap-4">
            <h4 className="font-semibold text-sm tracking-wide text-foreground uppercase opacity-80">Institucional</h4>
            <ul className="space-y-3">
              <li>
                <FooterLink href="https://www.trilink.com.br/" external>
                  <Globe className="h-3.5 w-3.5 mr-2 opacity-70" /> Site
                </FooterLink>
              </li>
              <li>
                <FooterLink href="https://www.trilink.com.br/public/downloads" external>
                  <Download className="h-3.5 w-3.5 mr-2 opacity-70" /> Área de Downloads
                </FooterLink>
              </li>
            </ul>
          </div>

          {/* COLUNA 3: Suporte */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="font-semibold text-sm tracking-wide text-foreground uppercase opacity-80">Suporte</h4>
            <ul className="space-y-3">
              <li><FooterLink href="/docs/manual">Documentação Oficial</FooterLink></li>
              <li><FooterLink href="/docs/duvidas">Dúvidas Frequentes</FooterLink></li>
              <li><FooterLink href="/docs/suporte">Suporte</FooterLink></li>
            </ul>
          </div>

          {/* COLUNA 4: Legal */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="font-semibold text-sm tracking-wide text-foreground uppercase opacity-80">Acesso Rápido</h4>
            <ul className="space-y-3">
              <li><FooterLink href="/login">Login</FooterLink></li>
              <li><FooterLink href="/client">Portal do Cliente</FooterLink></li>
            </ul>
          </div>

        </div>

        {/* --- RODAPÉ INFERIOR --- */}
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            &copy; {currentYear} Trilink Software Ltda. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <FooterLink href="/termos">Termos de Uso</FooterLink>
            <FooterLink href="/privacidade">Política de Privacidade</FooterLink>
          </div>
        </div>

      </div>
    </footer>
  );
}

/* =======================================================
   COMPONENTES AUXILIARES (Magic UI Style)
======================================================= */

function FooterLink({
  href,
  children,
  external,
  highlight
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`
        group flex items-center w-fit text-sm transition-all duration-200
        ${highlight
          ? "font-medium text-foreground hover:text-primary"
          : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {children}
      {/* Seta animada no hover */}
      <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 ml-1">
        {external ? <ExternalLink className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
      </span>
    </Link>
  );
}

function SocialButton({ href, icon: Icon, label, hoverColor }: { href: string; icon: any; label: string; hoverColor: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <Button
        variant="outline"
        size="icon"
        className={`h-9 w-9 rounded-full bg-background/50 border-border/50 backdrop-blur-sm transition-all duration-300 ${hoverColor}`}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </Link>
  );
}