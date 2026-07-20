"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpCompaniesView({ details }: Props) {
  const installations = [
    {
      id: "inst-1",
      name: "Instalação Produção",
      path: "C:\\Syspro\\Server",
      mainCompany: "CASA DE CARNE MARAVILHA",
      otherCompanies: [
        "Empresa B",
        "Empresa C"
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm mb-4">
        <p className="text-sm text-muted-foreground">
          Aqui estão listados os vínculos de empresas específicas que esta instalação atende. 
          Isso é diferente da empresa principal do dispositivo geral.
        </p>
      </div>

      {installations.map(inst => (
        <div key={inst.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 pb-4 border-b border-border/50">
            <h4 className="font-semibold text-lg text-foreground">{inst.name}</h4>
            <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded inline-block mt-2">
              {inst.path}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 text-sm">
            <div>
              <span className="text-muted-foreground block mb-2 font-medium">Empresa Principal</span>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {inst.mainCompany.charAt(0)}
                </div>
                <span className="font-semibold">{inst.mainCompany}</span>
              </div>
            </div>
            
            {inst.otherCompanies.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-2 font-medium">Outras empresas atendidas</span>
                <ul className="space-y-2">
                  {inst.otherCompanies.map((comp, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                      <span className="font-medium">{comp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
