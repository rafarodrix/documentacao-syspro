import React from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Headset,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SuporteSectionProps {
  modulo?: string;
}

const SuporteSection: React.FC<SuporteSectionProps> = ({ modulo = "este módulo" }) => {
  return (
    <section className="mt-24 border-t border-border/40 pt-16 pb-12">
      {/* Header com Estética de Command Center */}
      <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-end justify-between mb-12">
        <div className="space-y-4">
          <Badge variant="outline" className="px-3 py-1 border-primary/20 bg-primary/5 text-primary gap-2 transition-all hover:bg-primary/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Enterprise Support Plan</span>
          </Badge>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Suporte <span className="text-muted-foreground/50 font-light">|</span> <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{modulo}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              Engenharia de suporte dedicada para alta disponibilidade e resolução de incidentes complexos.
            </p>
          </div>
        </div>

        {/* Status Monitor Style */}
        <div className="flex items-center gap-4 bg-secondary/30 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-inner">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-emerald-500 animate-ping opacity-40" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">System Status</span>
            <span className="text-sm font-semibold text-foreground">Operacional: Todos os Sistemas</span>
          </div>
        </div>
      </div>

      {/* SLA Cards - Refined Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Horário Comercial */}
        <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-card to-background p-[1px]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-card/90 backdrop-blur-xl p-8 rounded-[23px] h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Clock className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-none">Tier 1 & 2</Badge>
            </div>
            <h3 className="text-xl font-bold mb-2">Horário Comercial</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Suporte técnico consultivo, configurações avançadas e treinamentos operacionais.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground bg-secondary/50 w-fit px-4 py-2 rounded-full border border-border/50">
              Segunda a Sexta <span className="text-muted-foreground">•</span> 08h às 18h
            </div>
          </div>
        </div>

        {/* Plantão Emergencial */}
        <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-card to-background p-[1px]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-card/90 backdrop-blur-xl p-8 rounded-[23px] h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 font-bold uppercase tracking-tighter">Critical Only</Badge>
            </div>
            <h3 className="text-xl font-bold mb-2">Plantão 24/7 Emergencial</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Exclusivo para incidentes de <strong>Parada Total</strong> ou falhas críticas que impedem a operação (Nível 1).
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-amber-500 bg-amber-500/5 w-fit px-4 py-2 rounded-full border border-amber-500/20">
              Fora do Horário Comercial
            </div>
          </div>
        </div>
      </div>

      {/* Canais de Atendimento - Glass Bento Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/70">Canais de Resposta</h3>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              title: "WhatsApp", 
              desc: "Consultas rápidas e fluxo operacional.", 
              icon: MessageCircle, 
              color: "text-emerald-500", 
              bg: "bg-emerald-500/5", 
              link: "https://wa.me/5534997713731",
              btn: "Abrir Chat"
            },
            { 
              title: "Direct Call", 
              desc: "Canal prioritário para emergências nível 1.", 
              icon: Phone, 
              color: "text-blue-500", 
              bg: "bg-blue-500/5", 
              link: "tel:+5534997713731",
              btn: "Ligar Agora"
            },
            { 
              title: "Email Corporativo", 
              desc: "Formalização e análise de logs estruturados.", 
              icon: Mail, 
              color: "text-purple-500", 
              bg: "bg-purple-500/5", 
              link: "mailto:equipe@trilinksoftware.com.br",
              btn: "Enviar Chamado"
            },
          ].map((item, idx) => (
            <a key={idx} href={item.link} className="group outline-none">
              <Card className="h-full border-border/40 bg-secondary/10 backdrop-blur-md transition-all duration-500 group-hover:border-primary/30 group-hover:bg-secondary/20 group-hover:-translate-y-2 overflow-hidden relative">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                    {item.title}
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-y-1 group-hover:translate-y-0" />
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-8">{item.desc}</p>
                  <Button variant="secondary" className="w-full bg-background/50 border-border/50 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    {item.btn}
                  </Button>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>

      {/* Footer Disclaimer - Minimalist */}
      <div className="mt-12 p-6 rounded-2xl bg-secondary/20 border border-border/40 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="p-2 rounded-full bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <p className="text-xs font-medium text-muted-foreground max-w-2xl leading-relaxed italic">
          <strong className="text-foreground not-italic">Protocolo de Emergência:</strong> Canais de texto não possuem monitoramento ativo fora do horário comercial. Para incidentes de parada total (P0), utilize obrigatoriamente o canal de voz.
        </p>
      </div>
    </section>
  );
};

export default SuporteSection;