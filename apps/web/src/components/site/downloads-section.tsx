import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, HardDrive, MonitorDown } from "lucide-react";

export function DownloadsSection() {
  return (
    <section className="relative overflow-hidden border-t border-border/40 py-24">
      <div className="absolute inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.08]" />
      </div>

      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-14 max-w-3xl">
          <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 text-primary">
            Downloads
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Downloads e instaladores em um ponto dedicado
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            O header fica focado em navegação. Os downloads ficam aqui na home, com acesso direto aos arquivos e atalhos principais.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/50 bg-background/60 backdrop-blur-sm">
            <CardContent className="flex h-full flex-col gap-6 p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-foreground">Area de downloads do site</h3>
                <p className="text-muted-foreground">
                  Acesse executaveis, instaladores, pacotes e arquivos publicados pela Trilink no site institucional.
                </p>
              </div>
              <div className="mt-auto">
                <Link href="https://www.trilink.com.br/public/downloads" target="_blank">
                  <Button className="gap-2">
                    <Download className="h-4 w-4" />
                    Abrir downloads
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-background/60 backdrop-blur-sm">
            <CardContent className="flex h-full flex-col gap-6 p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
                <MonitorDown className="h-6 w-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-foreground">Portal do cliente e operacao remota</h3>
                <p className="text-muted-foreground">
                  Para instaladores operacionais, scripts tecnicos e acesso remoto, use o portal e a area de Infraestrutura.
                </p>
              </div>
              <div className="mt-auto">
                <Link href="/login">
                  <Button variant="outline" className="gap-2">
                    Ir para o portal
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
