import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background Radiante */}
      <div className="absolute inset-0 bg-primary/5 -z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-background to-transparent -z-10" />

      <div className="container px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 max-w-2xl mx-auto">
          Sua operação Syspro em outro nível.
        </h2>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10">
          Junte-se às empresas que confiam na Trilink para garantir estabilidade, compliance e inovação.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="h-12 px-10 text-base shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all">
              Acessar Portal Agora
            </Button>
          </Link>
          <Link href="/contato">
            <Button variant="ghost" size="lg" className="h-12 px-10 text-base hover:bg-white/5">
              Falar com Consultor
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}