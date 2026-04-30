export const SEFAZ_UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export type SefazUfCode = (typeof SEFAZ_UFS)[number];

export type SefazContingencyAuthorizer = "SVC-AN" | "SVC-RS" | null;

export interface SefazOperationalProfile {
  uf: SefazUfCode;
  mainAuthorizer: "Estadual" | "SVRS" | "SVAN";
  cadastroAuthorizer: "SVRS" | null;
  contingencyAuthorizer: SefazContingencyAuthorizer;
}

const SVRS_MAIN_UFS = new Set<SefazUfCode>([
  "AC",
  "AL",
  "AP",
  "CE",
  "DF",
  "ES",
  "PA",
  "PB",
  "PI",
  "RJ",
  "RN",
  "RO",
  "RR",
  "SC",
  "SE",
  "TO",
]);

const SVRS_CADASTRO_UFS = new Set<SefazUfCode>(["AC", "ES", "PB", "RN", "SC"]);
const SVC_AN_UFS = new Set<SefazUfCode>([
  "AC",
  "AL",
  "AP",
  "CE",
  "DF",
  "ES",
  "MG",
  "PA",
  "PB",
  "PI",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
]);
const SVC_RS_UFS = new Set<SefazUfCode>(["AM", "BA", "GO", "MA", "MS", "MT", "PE", "PR"]);

export const SEFAZ_OPERATIONAL_PROFILES: readonly SefazOperationalProfile[] = SEFAZ_UFS.map((uf) => ({
  uf,
  mainAuthorizer: uf === "MA" ? "SVAN" : SVRS_MAIN_UFS.has(uf) ? "SVRS" : "Estadual",
  cadastroAuthorizer: SVRS_CADASTRO_UFS.has(uf) ? "SVRS" : null,
  contingencyAuthorizer: SVC_AN_UFS.has(uf) ? "SVC-AN" : SVC_RS_UFS.has(uf) ? "SVC-RS" : null,
}));

export function getSefazOperationalProfile(uf: string): SefazOperationalProfile | null {
  const normalized = uf.trim().toUpperCase() as SefazUfCode;
  return SEFAZ_OPERATIONAL_PROFILES.find((item) => item.uf === normalized) ?? null;
}
