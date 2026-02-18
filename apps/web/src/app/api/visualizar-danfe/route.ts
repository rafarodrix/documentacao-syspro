import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// region 1: TIPAGEM E INTERFACES (Melhora a organização e segurança)
// =============================================================

interface Danfe {
  meta: {
    versao: string;
    chave: string;
  };
  ide: any; // Idealmente, tipar cada seção
  emit: any;
  dest: any;
  transp: any;
  cobr: any;
  pag: any;
  total: any;
  infAdic: any;
  det: any[];
  raw: any; // Mantém o nó original para debug
}

// endregion

// region 2: CONSTANTES E MAPAS (Centraliza dados estáticos)
// =============================================================

const modFreteMap: Record<string, string> = {
  '0': '0 - Por conta do Emitente (CIF)',
  '1': '1 - Por conta do Destinatário (FOB)',
  '2': '2 - Por conta de Terceiros',
  '3': '3 - Transporte Próprio (Remetente)',
  '4': '4 - Transporte Próprio (Destinatário)',
  '9': '9 - Sem Transporte',
};

const tpNFMap: Record<string, string> = { '0': '0 - Entrada', '1': '1 - Saída' };
const indPagMap: Record<string, string> = { '0': 'À vista', '1': 'A prazo', '2': 'Outros' };

// endregion

// region 3: FUNÇÕES AUXILIARES (Utilitários reutilizáveis)
// =============================================================

/** Garante que um valor não é nulo ou indefinido, retornando um fallback. */
const safe = <T>(value: T | null | undefined, fallback: T): T =>
  value === undefined || value === null ? fallback : value;

/** Garante que um valor seja sempre um array, útil para tags XML que podem ser únicas ou múltiplas. */
const asArray = (value: any): any[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

/** Formata um objeto de endereço em uma string legível. */
const formatAddress = (ender: any): string => {
  if (!ender) return '';
  const parts = [
    safe(ender.xLgr, ''),
    safe(ender.nro, ''),
    ender.xCpl ? `(${ender.xCpl})` : '',
    safe(ender.xBairro, ''),
    ender.xMun ? `${ender.xMun}/${safe(ender.UF, '')}` : '',
    ender.CEP ? `CEP: ${ender.CEP}` : '',
  ];
  return parts.filter(Boolean).join(', ');
};

/** Converte um valor para número, tratando vírgula decimal e retornando null em caso de falha. */
const normalizeNumber = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

/**
 * Encontra o nó principal `infNFe` dentro do objeto XML parseado,
 * lidando com as estruturas mais comuns (`nfeProc` ou `NFe` na raiz).
 */
const findNfeRoot = (parsedXml: any): any => {
    return parsedXml?.nfeProc?.NFe?.infNFe || parsedXml?.NFe?.infNFe || parsedXml?.infNFe || null;
}

// endregion

// region 4: FUNÇÕES DE PARSING MODULARES (Separa as responsabilidades)
// =============================================================

const parseIde = (ideNode: any) => {
  if (!ideNode) return {};
  return {
    cUF: safe(ideNode.cUF, ''),
    cNF: safe(ideNode.cNF, ''),
    natOp: safe(ideNode.natOp, ''),
    mod: safe(ideNode.mod, ''),
    serie: safe(ideNode.serie, ''),
    nNF: safe(ideNode.nNF, ''),
    dhEmi: safe(ideNode.dhEmi, '') || safe(ideNode.dEmi, ''),
    dhSaiEnt: safe(ideNode.dhSaiEnt, '') || safe(ideNode.dSaiEnt, ''),
    tpNF: tpNFMap[safe(ideNode.tpNF, '')] || safe(ideNode.tpNF, ''),
    idDest: safe(ideNode.idDest, ''),
    finNFe: safe(ideNode.finNFe, ''),
    NFref: asArray(ideNode.NFref),
    raw: ideNode,
  };
};

const parseEmitente = (emitNode: any) => {
  if (!emitNode) return {};
  return {
    CNPJ: safe(emitNode.CNPJ, ''),
    CPF: safe(emitNode.CPF, ''),
    xNome: safe(emitNode.xNome, ''),
    xFant: safe(emitNode.xFant, ''),
    IE: safe(emitNode.IE, ''),
    CRT: safe(emitNode.CRT, ''),
    enderEmit: formatAddress(emitNode.enderEmit),
    raw: emitNode,
  };
};

const parseDestinatario = (destNode: any) => {
    if (!destNode) return {};
    return {
        CNPJ: safe(destNode.CNPJ, ''),
        CPF: safe(destNode.CPF, ''),
        idEstrangeiro: safe(destNode.idEstrangeiro, ''),
        xNome: safe(destNode.xNome, ''),
        indIEDest: safe(destNode.indIEDest, ''),
        IE: safe(destNode.IE, ''),
        email: safe(destNode.email, ''),
        enderDest: formatAddress(destNode.enderDest),
        raw: destNode,
    };
};

const parseTotais = (totalNode: any) => {
    const icmsTot = totalNode?.ICMSTot;
    if (!icmsTot) return {};
    return {
        vBC: normalizeNumber(icmsTot.vBC),
        vICMS: normalizeNumber(icmsTot.vICMS),
        vICMSDeson: normalizeNumber(icmsTot.vICMSDeson),
        vBCST: normalizeNumber(icmsTot.vBCST),
        vST: normalizeNumber(icmsTot.vST),
        vProd: normalizeNumber(icmsTot.vProd),
        vFrete: normalizeNumber(icmsTot.vFrete),
        vSeg: normalizeNumber(icmsTot.vSeg),
        vDesc: normalizeNumber(icmsTot.vDesc),
        vII: normalizeNumber(icmsTot.vII),
        vIPI: normalizeNumber(icmsTot.vIPI),
        vPIS: normalizeNumber(icmsTot.vPIS),
        vCOFINS: normalizeNumber(icmsTot.vCOFINS),
        vOutro: normalizeNumber(icmsTot.vOutro),
        vNF: normalizeNumber(icmsTot.vNF),
        raw: totalNode,
    };
};

const parseItens = (detList: any) => {
    return asArray(detList).map((det: any) => {
        const prod = det.prod || {};
        const imposto = det.imposto || {};

        // A estrutura de impostos pode variar (ex: ICMS00, ICMS10, PISAliq, PISNT).
        // Esta lógica encontra o objeto de dados dentro da tag principal do imposto.
        const icmsObj = imposto.ICMS ? Object.values(imposto.ICMS).find(v => typeof v === 'object') || {} : {};
        const ipiObj = imposto.IPI ? (imposto.IPI.IPITrib || imposto.IPI.IPINT || {}) : {};
        const pisObj = imposto.PIS ? (imposto.PIS.PISAliq || imposto.PIS.PISOutr || imposto.PIS.PISNT || {}) : {};
        const cofinsObj = imposto.COFINS ? (imposto.COFINS.COFINSAliq || imposto.COFINS.COFINSOutr || imposto.COFINS.COFINSNT || {}) : {};

        return {
            nItem: safe(det['@_nItem'], ''),
            cProd: safe(prod.cProd, ''),
            cEAN: safe(prod.cEAN, ''),
            xProd: safe(prod.xProd, ''),
            NCM: safe(prod.NCM, ''),
            CFOP: safe(prod.CFOP, ''),
            uCom: safe(prod.uCom, ''),
            qCom: normalizeNumber(prod.qCom),
            vUnCom: normalizeNumber(prod.vUnCom),
            vProd: normalizeNumber(prod.vProd),
            vFrete: normalizeNumber(prod.vFrete),
            vSeg: normalizeNumber(prod.vSeg),
            vDesc: normalizeNumber(prod.vDesc),
            indTot: safe(prod.indTot, ''),
            infAdProd: safe(det.infAdProd, ''),

            impostos: {
                vTotTrib: normalizeNumber(imposto.vTotTrib),
                ICMS: {
                    orig: safe((icmsObj as any).orig, null),
                    CST: safe((icmsObj as any).CST, null) || safe((icmsObj as any).CSOSN, null),
                    vBC: normalizeNumber((icmsObj as any).vBC),
                    pICMS: normalizeNumber((icmsObj as any).pICMS),
                    vICMS: normalizeNumber((icmsObj as any).vICMS),
                },
                IPI: {
                    CST: safe((ipiObj as any).CST, null),
                    vIPI: normalizeNumber((ipiObj as any).vIPI),
                },
                PIS: {
                    CST: safe((pisObj as any).CST, null),
                    vBC: normalizeNumber((pisObj as any).vBC),
                    pPIS: normalizeNumber((pisObj as any).pPIS),
                    vPIS: normalizeNumber((pisObj as any).vPIS),
                },
                COFINS: {
                    CST: safe((cofinsObj as any).CST, null),
                    vBC: normalizeNumber((cofinsObj as any).vBC),
                    pCOFINS: normalizeNumber((cofinsObj as any).pCOFINS),
                    vCOFINS: normalizeNumber((cofinsObj as any).vCOFINS),
                },
            },
            raw: det,
        };
    });
};

const parseTransporte = (transpNode: any) => {
    if (!transpNode) return {};
    return {
        modFrete: modFreteMap[safe(transpNode.modFrete, '')] || safe(transpNode.modFrete, ''),
        transporta: transpNode.transporta || {},
        veicTransp: transpNode.veicTransp || {},
        vol: asArray(transpNode.vol),
        raw: transpNode,
    };
};

const parseCobranca = (cobrNode: any) => {
    if (!cobrNode) return {};
    return {
        fat: cobrNode.fat || {},
        dup: asArray(cobrNode.dup).map((d: any) => ({
            nDup: safe(d.nDup, ''),
            dVenc: safe(d.dVenc, ''),
            vDup: normalizeNumber(d.vDup),
        })),
        raw: cobrNode,
    };
};

const parsePagamento = (pagNode: any) => {
    if (!pagNode) return {};
    const detPag = asArray(pagNode.detPag);
    return {
        detPag: detPag.map((p: any) => ({
            indPag: indPagMap[safe(p.indPag, '')] || safe(p.indPag, ''), // indPag pode estar no detalhe
            tPag: safe(p.tPag, ''),
            vPag: normalizeNumber(p.vPag),
            card: p.card || null,
        })),
        vTroco: normalizeNumber(pagNode.vTroco),
        raw: pagNode,
    };
};

const parseInfoAdicional = (infAdicNode: any) => {
    if (!infAdicNode) return {};
    return {
        infCpl: safe(infAdicNode.infCpl, ''),
        infAdFisco: safe(infAdicNode.infAdFisco, ''),
        obsCont: asArray(infAdicNode.obsCont).map((o: any) => ({ xCampo: o.xCampo, xTexto: o.xTexto })),
        obsFisco: asArray(infAdicNode.obsFisco).map((o: any) => ({ xCampo: o.xCampo, xTexto: o.xTexto })),
        raw: infAdicNode,
    };
};

// endregion

// region 5: ROTA DA API (Ponto de entrada principal)
// =============================================================

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const xml = await file.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseTagValue: false,
    });

    const parsedXml = parser.parse(xml);
    const nfeRoot = findNfeRoot(parsedXml);

    if (!nfeRoot) {
      return NextResponse.json({ error: 'Estrutura de XML de NF-e não reconhecida.' }, { status: 400 });
    }

    const chave = String(safe(nfeRoot['@_Id'], '')).replace(/^NFe/i, '');

    // Monta o objeto final chamando as funções de parsing modulares
    const danfeData: Danfe = {
      meta: {
        versao: safe(nfeRoot['@_versao'], ''),
        chave,
      },
      ide: parseIde(nfeRoot.ide),
      emit: parseEmitente(nfeRoot.emit),
      dest: parseDestinatario(nfeRoot.dest),
      transp: parseTransporte(nfeRoot.transp),
      cobr: parseCobranca(nfeRoot.cobr),
      pag: parsePagamento(nfeRoot.pag),
      total: parseTotais(nfeRoot.total),
      infAdic: parseInfoAdicional(nfeRoot.infAdic),
      det: parseItens(nfeRoot.det),
      raw: nfeRoot, // Inclui o nó raiz parseado para fins de debug ou dados não mapeados
    };

    return NextResponse.json(danfeData);
  } catch (error: any) {
    console.error('Erro ao processar XML da NF-e:', error);
    return NextResponse.json(
      { error: 'Falha ao processar o arquivo XML.', details: error.message },
      { status: 500 }
    );
  }
}
// endregion