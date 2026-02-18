import React from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Headset,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SuporteSectionProps {
  modulo?: string;
}

const SuporteSection: React.FC<SuporteSectionProps> = ({ modulo = "este módulo" }) => {
  return (
    <div className="mt-16 border-t border-border/50 pt-10 space-y-10">

      {/* Cabeçalho com Visual Enterprise */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-medium text-sm uppercase tracking-wider">
            <Headset className="h-4 w-4" />
            Central de Ajuda
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Suporte Especializado: <span className="text-primary">{modulo}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Nossa equipe técnica está pronta para resolver dúvidas complexas e garantir a estabilidade da sua operação.
          </p>
        </div>

        {/* Status/Badge decorativo */}
        <div className="hidden md:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">Sistemas Operacionais</span>
        </div>
      </div>

      {/* Grid de Informações SLA (Service Level Agreement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Horário Comercial */}
        <Card className="relative overflow-hidden border-l-4 border-l-green-500 bg-gradient-to-br from-background to-green-500/5 dark:to-green-500/10 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              Horário Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Segunda a Sexta: 08h às 18h</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Atendimento completo para dúvidas, configurações, treinamentos e suporte técnico nível 1 e 2.
            </p>
          </CardContent>
        </Card>

        {/* Card Plantão */}
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-br from-background to-amber-500/5 dark:to-amber-500/10 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Plantão Emergencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Fora do horário comercial</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Exclusivo para <strong>parada total</strong> do sistema ou falhas críticas impeditivas (Nível 1).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Canais de Contato Estilo "Magic UI" (Bento Grid) */}
      <div>
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          Canais de Atendimento
          <span className="h-px flex-1 bg-border ml-4"></span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* WhatsApp - Magic Card Effect */}
          <a href="https://wa.me/5534997713731" target="_blank" rel="noopener noreferrer" className="group relative h-full">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            <Card className="relative h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group-hover:border-green-500/50 group-hover:-translate-y-1">
              <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">Resposta rápida para dúvidas do dia a dia.</p>
                </div>
                <Button variant="outline" className="w-full group-hover:bg-green-500 group-hover:text-white group-hover:border-green-600 transition-all">
                  Iniciar Conversa <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </a>

          {/* Telefone - Magic Card Effect */}
          <a href="tel:+5534997713731" className="group relative h-full">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            <Card className="relative h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group-hover:border-blue-500/50 group-hover:-translate-y-1">
              <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">Telefone</h4>
                  <p className="text-sm text-muted-foreground">Canal exclusivo para o plantão de emergência.</p>
                </div>
                <Button variant="outline" className="w-full group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-600 transition-all">
                  Ligar Agora <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </a>

          {/* Email - Magic Card Effect */}
          <a href="mailto:equipe@trilinksoftware.com.br" className="group relative h-full">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            <Card className="relative h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group-hover:border-amber-500/50 group-hover:-translate-y-1">
              <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">E-mail</h4>
                  <p className="text-sm text-muted-foreground">Para solicitações formais e envio de logs.</p>
                </div>
                <Button variant="outline" className="w-full group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-600 transition-all">
                  Enviar E-mail <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </a>

        </div>
      </div>

      {/* Footer da seção com Disclaimer */}
      <div className="bg-muted/30 border rounded-lg p-4 flex items-start gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p>
          <strong>Importante:</strong> Canais de texto (WhatsApp e E-mail) não são monitorados fora do horário comercial.
          Para emergências durante o plantão, utilize sempre o telefone.
        </p>
      </div>
    </div>
  );
};

export default SuporteSection;