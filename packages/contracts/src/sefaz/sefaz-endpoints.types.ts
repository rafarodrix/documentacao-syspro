export type SefazServiceType = "NFE" | "NFCE" | "CTE" | "MDFE";

export interface SefazRoutePreset {
  uf: string;
  service: SefazServiceType;
  url: string;
}

export const SEFAZ_ROUTE_PRESETS: readonly SefazRoutePreset[] = [
  { uf: "MG", service: "NFE", url: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4" },
  { uf: "MG", service: "NFCE", url: "https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4" },
  { uf: "MG", service: "CTE", url: "https://cte.fazenda.mg.gov.br/cte/services/CTeAutorizacao4" },
  { uf: "SP", service: "NFE", url: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx" },
  { uf: "SP", service: "NFCE", url: "https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx" },
  { uf: "SP", service: "CTE", url: "https://cte.fazenda.sp.gov.br/ws/cteautorizacao4.asmx" },
  { uf: "RS", service: "NFE", url: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx" },
  { uf: "RS", service: "NFCE", url: "https://nfce.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx" },
  { uf: "PR", service: "NFE", url: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4" },
  { uf: "PR", service: "NFCE", url: "https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4" },
  { uf: "PR", service: "CTE", url: "https://cte.sefa.pr.gov.br/cte/CTeAutorizacao4" },
  { uf: "AM", service: "NFE", url: "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4" },
  { uf: "AM", service: "NFCE", url: "https://nfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4" },
  { uf: "BA", service: "NFE", url: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx" },
  { uf: "BA", service: "NFCE", url: "https://nfce.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx" },
  { uf: "CE", service: "NFE", url: "https://nfe.sefaz.ce.gov.br/nfe2/services/NfeAutorizacao4" },
  { uf: "CE", service: "NFCE", url: "https://nfce.sefaz.ce.gov.br/nfce4/services/NfeAutorizacao4" },
  { uf: "GO", service: "NFE", url: "https://nfe.sefaz.go.gov.br/nfe/services/v2/NfeAutorizacao4" },
  { uf: "GO", service: "NFCE", url: "https://nfce.sefaz.go.gov.br/nfe/services/v2/NfeAutorizacao4" },
  { uf: "MS", service: "NFE", url: "https://nfe.fazenda.ms.gov.br/producao/services2/NFeAutorizacao4" },
  { uf: "MS", service: "NFCE", url: "https://nfce.fazenda.ms.gov.br/producao/services2/NFeAutorizacao4" },
  { uf: "MT", service: "NFE", url: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4" },
  { uf: "MT", service: "NFCE", url: "https://nfce.sefaz.mt.gov.br/nfcews/services/NfeAutorizacao4" },
  { uf: "PE", service: "NFE", url: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4" },
  { uf: "PE", service: "NFCE", url: "https://nfce.sefaz.pe.gov.br/nfce-service/services/NFeAutorizacao4" },
  { uf: "PI", service: "NFCE", url: "https://webas.sefaz.pi.gov.br/nfce/services/NfeAutorizacao4" },
  { uf: "SVRS", service: "NFE", url: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx" },
  { uf: "SVRS", service: "NFCE", url: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx" },
  { uf: "SVRS", service: "CTE", url: "https://cte.svrs.rs.gov.br/ws/CteAutorizacao/CteAutorizacao4.asmx" },
  { uf: "SVRS", service: "MDFE", url: "https://mdfe.svrs.rs.gov.br/ws/MDFeRecepcao/MDFeRecepcao.asmx" },
  { uf: "SVAN", service: "NFE", url: "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx" },
  { uf: "SVAN", service: "NFCE", url: "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx" },
] as const;

export const SEFAZ_ENDPOINTS = SEFAZ_ROUTE_PRESETS;

export type SefazConfig = (typeof SEFAZ_ENDPOINTS)[number];

export function buildDefaultSefazRoutes() {
  const seen = new Set<string>();
  return SEFAZ_ROUTE_PRESETS.filter((route) => {
    const key = `${route.uf}-${route.service}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((route) => ({ uf: route.uf, service: route.service, url: route.url, active: true }));
}

export function analyzeSefazResponse(latency: number, statusCode: number): "ONLINE" | "UNSTABLE" | "OFFLINE" {
  if (statusCode >= 500) return "OFFLINE";
  if (latency > 2500) return "UNSTABLE";
  return "ONLINE";
}