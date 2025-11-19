import Link from 'next/link';
import { FileText, LifeBuoy, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ClientPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">
        Seja Bem-vindo(a) ao Portal Syspro
      </h1>
      <p className="text-lg text-muted-foreground">
        Acesse rapidamente os manuais, abra chamados e utilize suas ferramentas.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Documentação */}
        <Link href="/docs" passHref>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Base de Conhecimento</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manuais</div>
              <p className="text-xs text-muted-foreground">Acesse todas as guias oficiais.</p>
            </CardContent>
          </Card>
        </Link>
        
        {/* Card 2: Ferramentas */}
        <Link href="/client/tools" passHref>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ferramentas</CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Analisador XML</div>
              <p className="text-xs text-muted-foreground">Validação e conversão rápida.</p>
            </CardContent>
          </Card>
        </Link>
        
        {/* Card 3: Suporte */}
        <Link href="/docs/suporte" passHref>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suporte</CardTitle>
              <LifeBuoy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Abrir Chamado</div>
              <p className="text-xs text-muted-foreground">Acompanhe seus tickets.</p>
            </CardContent>
          </Card>
        </Link>
        
      </div>
    </div>
  );
}