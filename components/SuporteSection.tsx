import React from 'react';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import { MessagesSquare, Phone, Mail, AlarmClock, Briefcase} from 'lucide-react';

interface SuporteSectionProps {
  modulo?: string;
}

const SuporteSection: React.FC<SuporteSectionProps> = ({ modulo = "o módulo" }) => {
  return (
    <section>
      <h2>Suporte ao Módulo de {modulo}</h2>
      <p>Precisa de ajuda? Nossa equipe está pronta para oferecer suporte especializado para {modulo}.</p>

      <h3>Horários de Atendimento</h3>
      <Cards>
        <Card title="Horário Comercial" icon={<Briefcase className="h-5 w-5" />}>
          <ul>
            <li><strong>Segunda a sexta</strong>: 8h às 18h</li>
            <li>Atendimento completo para todas as suas dúvidas.</li>
          </ul>
        </Card>
        <Card title="Horário de Plantão" icon={<AlarmClock className="h-5 w-5" />}>
          <ul>
            <li><strong>Segunda a sexta</strong>: 18h às 21h</li>
            <li><strong>Sábados, domingos e feriados</strong>: 8h às 20h</li>
            <li>Suporte para emergências, como falhas críticas no módulo.</li>
          </ul>
        </Card>
      </Cards>

      <Callout type="warn" title="Atenção">
        O WhatsApp não é monitorado no plantão. Use o telefone para emergências.
      </Callout>

      <h3 className="text-lg font-semibold mb-4">Canais de Suporte</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* WhatsApp */}
        <a
          href="https://wa.me/5534997713731"
          target="_blank"
          rel="noopener noreferrer"
          className="block no-underline"
        >
          <Card
            title="WhatsApp"
            className="flex flex-col items-start gap-2 p-4 hover:border-green-500 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-600/10 text-green-500 p-2 rounded-full flex items-center justify-center">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <span className="text-base font-semibold">WhatsApp</span>
            </div>
            <p className="text-sm font-medium">
              (34) 99771-3731
            </p>
            <p className="text-sm text-muted-foreground">
              Resposta rápida para dúvidas.
            </p>
          </Card>
        </a>

        {/* Telefone */}
        <a
          href="tel:+5534997713731"
          className="block no-underline"
        >
          <Card
            title="Telefone"
            className="flex flex-col items-start gap-2 p-4 hover:border-blue-500 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/10 text-blue-500 p-2 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <span className="text-base font-semibold">Telefone</span>
            </div>
            <p className="text-sm font-medium">
              (34) 99771-3731
            </p>
            <p className="text-sm text-muted-foreground">
              Ideal para suporte Urgente.
            </p>
          </Card>
        </a>

        {/* E-mail */}
        <a
          href="mailto:equipe@trilinksoftware.com.br"
          className="block no-underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card
            title="E-mail"
            className="flex flex-col items-start gap-2 p-4 hover:border-yellow-500 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <span className="text-base font-semibold">E-mail</span>
            </div>
            <p className="text-sm font-medium break-all">
              equipe@trilinksoftware.com.br
            </p>
            <p className="text-sm text-muted-foreground">
              Para solicitações detalhadas.
            </p>
          </Card>
        </a>
      </div>
    </section>
  );
};

export default SuporteSection;
