import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40 py-10">
      <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-lg font-bold">Trilink Software</span>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            Soluções inteligentes para gestão empresarial. <br />
            &copy; {new Date().getFullYear()} Todos os direitos reservados.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/termos" className="hover:text-primary transition-colors">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-primary transition-colors">
            Privacidade
          </Link>
          <Link href="/docs" className="hover:text-primary transition-colors">
            Docs
          </Link>
        </div>

      </div>
    </footer>
  );
}