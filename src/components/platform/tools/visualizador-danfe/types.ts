// components/danfe-visualizer/types.ts
export interface DanfeImpostos {
  vTotTrib: number | null;
  ICMS: {
    orig: string | null; CST: string | null; vBC: number | null; pICMS: number | null; vICMS: number | null;
    vBCST?: number | null; pMVAST?: number | null; pICMSST?: number | null; vICMSST?: number | null;
    pRedBC?: number | null; vICMSDeson?: number | null; motDesICMS?: string | null;
  };
  IPI: { CST: string | null; pIPI: number | null; vIPI: number | null; };
  PIS: { CST: string | null; vBC: number | null; pPIS: number | null; vPIS: number | null; };
  COFINS: { CST: string | null; vBC: number | null; pCOFINS: number | null; vCOFINS: number | null; };
}

export interface ItemData {
  nItem: string; cProd: string; xProd: string; NCM: string; CFOP: string; uCom: string;
  qCom: number | null; vUnCom: number | null; vProd: number | null;
  impostos: DanfeImpostos;
}

export interface DanfeData {
  meta: { chave: string; };
  ide: { nNF: string; serie: string; dhEmi: string; natOp: string; };
  emit: { xNome: string; CNPJ: string; IE: string; enderEmit: string; };
  dest: {
    xNome: string; CNPJ: string; CPF: string; IE: string; enderDest: string;
    raw: { UF: string; };
  };
  total: {
    vProd: number | null; vFrete: number | null; vST: number | null; vIPI: number | null;
    vDesc: number | null; vNF: number | null; vBC: number | null; vICMS: number | null;
    vPIS: number | null; vCOFINS: number | null; vTotTrib: number | null;
  };
  det: ItemData[];
}

export interface SugestaoTributaria {
  sugestao: string;
  informacao: string;
}