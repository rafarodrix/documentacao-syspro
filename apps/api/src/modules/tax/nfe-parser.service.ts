import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

export interface Danfe {
  meta: {
    versao: string;
    chave: string;
  };
  ide: Record<string, unknown>;
  emit: Record<string, unknown>;
  dest: Record<string, unknown>;
  transp: Record<string, unknown>;
  cobr: Record<string, unknown>;
  pag: Record<string, unknown>;
  total: Record<string, unknown>;
  infAdic: Record<string, unknown>;
  det: Array<Record<string, unknown>>;
  raw: JsonObject;
}

// ---------------------------------------------------------------------------
// Mapas de referência
// ---------------------------------------------------------------------------

const modFreteMap: Record<string, string> = {
  '0': '0 - Por conta do Emitente (CIF)',
  '1': '1 - Por conta do Destinatario (FOB)',
  '2': '2 - Por conta de Terceiros',
  '3': '3 - Transporte Proprio (Remetente)',
  '4': '4 - Transporte Proprio (Destinatario)',
  '9': '9 - Sem Transporte',
};

const tpNFMap: Record<string, string> = { '0': '0 - Entrada', '1': '1 - Saida' };
const indPagMap: Record<string, string> = { '0': 'A vista', '1': 'A prazo', '2': 'Outros' };

// ---------------------------------------------------------------------------
// Helpers utilitários
// ---------------------------------------------------------------------------

const safe = <T>(value: T | null | undefined, fallback: T): T =>
  value === undefined || value === null ? fallback : value;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject | null {
  return isObject(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function readString(node: unknown, key: string): string {
  const obj = asObject(node);
  if (!obj) return '';
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function readNode(node: unknown, key: string): unknown {
  const obj = asObject(node);
  return obj ? obj[key] : undefined;
}

function normalizeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function formatAddress(ender: unknown): string {
  const node = asObject(ender);
  if (!node) return '';

  const xLgr = readString(node, 'xLgr');
  const nro = readString(node, 'nro');
  const xCpl = readString(node, 'xCpl');
  const xBairro = readString(node, 'xBairro');
  const xMun = readString(node, 'xMun');
  const uf = readString(node, 'UF');
  const cep = readString(node, 'CEP');

  const parts = [
    xLgr,
    nro,
    xCpl ? `(${xCpl})` : '',
    xBairro,
    xMun ? `${xMun}/${uf}` : '',
    cep ? `CEP: ${cep}` : '',
  ];

  return parts.filter(Boolean).join(', ');
}

function readPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const part of path) {
    if (!isObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

function findNfeRoot(parsedXml: unknown): JsonObject | null {
  const candidates = [
    readPath(parsedXml, ['nfeProc', 'NFe', 'infNFe']),
    readPath(parsedXml, ['NFe', 'infNFe']),
    readPath(parsedXml, ['infNFe']),
  ];

  for (const candidate of candidates) {
    const node = asObject(candidate);
    if (node) return node;
  }

  return null;
}

function firstObjectInNode(value: unknown): JsonObject {
  if (!isObject(value)) return {};
  for (const node of Object.values(value)) {
    const obj = asObject(node);
    if (obj) return obj;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Funções de parsing por seção
// ---------------------------------------------------------------------------

function parseIde(ideNode: unknown): Record<string, unknown> {
  const node = asObject(ideNode);
  if (!node) return {};

  const tpNfRaw = readString(node, 'tpNF');
  return {
    cUF: readString(node, 'cUF'),
    cNF: readString(node, 'cNF'),
    natOp: readString(node, 'natOp'),
    mod: readString(node, 'mod'),
    serie: readString(node, 'serie'),
    nNF: readString(node, 'nNF'),
    dhEmi: readString(node, 'dhEmi') || readString(node, 'dEmi'),
    dhSaiEnt: readString(node, 'dhSaiEnt') || readString(node, 'dSaiEnt'),
    tpNF: tpNFMap[safe(tpNfRaw, '')] || tpNfRaw,
    idDest: readString(node, 'idDest'),
    finNFe: readString(node, 'finNFe'),
    NFref: asArray(readNode(node, 'NFref')),
    raw: node,
  };
}

function parseEmitente(emitNode: unknown): Record<string, unknown> {
  const node = asObject(emitNode);
  if (!node) return {};

  return {
    CNPJ: readString(node, 'CNPJ'),
    CPF: readString(node, 'CPF'),
    xNome: readString(node, 'xNome'),
    xFant: readString(node, 'xFant'),
    IE: readString(node, 'IE'),
    CRT: readString(node, 'CRT'),
    enderEmit: formatAddress(readNode(node, 'enderEmit')),
    raw: node,
  };
}

function parseDestinatario(destNode: unknown): Record<string, unknown> {
  const node = asObject(destNode);
  if (!node) return {};

  return {
    CNPJ: readString(node, 'CNPJ'),
    CPF: readString(node, 'CPF'),
    idEstrangeiro: readString(node, 'idEstrangeiro'),
    xNome: readString(node, 'xNome'),
    indIEDest: readString(node, 'indIEDest'),
    IE: readString(node, 'IE'),
    email: readString(node, 'email'),
    enderDest: formatAddress(readNode(node, 'enderDest')),
    raw: node,
  };
}

function parseTotais(totalNode: unknown): Record<string, unknown> {
  const icmsTot = asObject(readNode(totalNode, 'ICMSTot'));
  if (!icmsTot) return {};

  return {
    vBC: normalizeNumber(readNode(icmsTot, 'vBC')),
    vICMS: normalizeNumber(readNode(icmsTot, 'vICMS')),
    vICMSDeson: normalizeNumber(readNode(icmsTot, 'vICMSDeson')),
    vBCST: normalizeNumber(readNode(icmsTot, 'vBCST')),
    vST: normalizeNumber(readNode(icmsTot, 'vST')),
    vProd: normalizeNumber(readNode(icmsTot, 'vProd')),
    vFrete: normalizeNumber(readNode(icmsTot, 'vFrete')),
    vSeg: normalizeNumber(readNode(icmsTot, 'vSeg')),
    vDesc: normalizeNumber(readNode(icmsTot, 'vDesc')),
    vII: normalizeNumber(readNode(icmsTot, 'vII')),
    vIPI: normalizeNumber(readNode(icmsTot, 'vIPI')),
    vPIS: normalizeNumber(readNode(icmsTot, 'vPIS')),
    vCOFINS: normalizeNumber(readNode(icmsTot, 'vCOFINS')),
    vOutro: normalizeNumber(readNode(icmsTot, 'vOutro')),
    vNF: normalizeNumber(readNode(icmsTot, 'vNF')),
    raw: asObject(totalNode) ?? {},
  };
}

function parseItens(detList: unknown): Array<Record<string, unknown>> {
  return asArray(detList).map((det): Record<string, unknown> => {
    const detObj = asObject(det) ?? {};
    const prod = asObject(readNode(detObj, 'prod')) ?? {};
    const imposto = asObject(readNode(detObj, 'imposto')) ?? {};

    const icmsObj = firstObjectInNode(readNode(imposto, 'ICMS'));
    const ipiNode = asObject(readNode(imposto, 'IPI')) ?? {};
    const ipiObj = asObject(readNode(ipiNode, 'IPITrib')) ?? asObject(readNode(ipiNode, 'IPINT')) ?? {};
    const pisNode = asObject(readNode(imposto, 'PIS')) ?? {};
    const pisObj =
      asObject(readNode(pisNode, 'PISAliq')) ??
      asObject(readNode(pisNode, 'PISOutr')) ??
      asObject(readNode(pisNode, 'PISNT')) ??
      {};
    const cofinsNode = asObject(readNode(imposto, 'COFINS')) ?? {};
    const cofinsObj =
      asObject(readNode(cofinsNode, 'COFINSAliq')) ??
      asObject(readNode(cofinsNode, 'COFINSOutr')) ??
      asObject(readNode(cofinsNode, 'COFINSNT')) ??
      {};

    return {
      nItem: readString(detObj, '@_nItem'),
      cProd: readString(prod, 'cProd'),
      cEAN: readString(prod, 'cEAN'),
      xProd: readString(prod, 'xProd'),
      NCM: readString(prod, 'NCM'),
      CFOP: readString(prod, 'CFOP'),
      uCom: readString(prod, 'uCom'),
      qCom: normalizeNumber(readNode(prod, 'qCom')),
      vUnCom: normalizeNumber(readNode(prod, 'vUnCom')),
      vProd: normalizeNumber(readNode(prod, 'vProd')),
      vFrete: normalizeNumber(readNode(prod, 'vFrete')),
      vSeg: normalizeNumber(readNode(prod, 'vSeg')),
      vDesc: normalizeNumber(readNode(prod, 'vDesc')),
      indTot: readString(prod, 'indTot'),
      infAdProd: readString(detObj, 'infAdProd'),
      impostos: {
        vTotTrib: normalizeNumber(readNode(imposto, 'vTotTrib')),
        ICMS: {
          orig: readString(icmsObj, 'orig') || null,
          CST: readString(icmsObj, 'CST') || readString(icmsObj, 'CSOSN') || null,
          vBC: normalizeNumber(readNode(icmsObj, 'vBC')),
          pICMS: normalizeNumber(readNode(icmsObj, 'pICMS')),
          vICMS: normalizeNumber(readNode(icmsObj, 'vICMS')),
        },
        IPI: {
          CST: readString(ipiObj, 'CST') || null,
          vIPI: normalizeNumber(readNode(ipiObj, 'vIPI')),
        },
        PIS: {
          CST: readString(pisObj, 'CST') || null,
          vBC: normalizeNumber(readNode(pisObj, 'vBC')),
          pPIS: normalizeNumber(readNode(pisObj, 'pPIS')),
          vPIS: normalizeNumber(readNode(pisObj, 'vPIS')),
        },
        COFINS: {
          CST: readString(cofinsObj, 'CST') || null,
          vBC: normalizeNumber(readNode(cofinsObj, 'vBC')),
          pCOFINS: normalizeNumber(readNode(cofinsObj, 'pCOFINS')),
          vCOFINS: normalizeNumber(readNode(cofinsObj, 'vCOFINS')),
        },
      },
      raw: detObj,
    };
  });
}

function parseTransporte(transpNode: unknown): Record<string, unknown> {
  const node = asObject(transpNode);
  if (!node) return {};

  const modFreteRaw = readString(node, 'modFrete');
  return {
    modFrete: modFreteMap[safe(modFreteRaw, '')] || modFreteRaw,
    transporta: asObject(readNode(node, 'transporta')) ?? {},
    veicTransp: asObject(readNode(node, 'veicTransp')) ?? {},
    vol: asArray(readNode(node, 'vol')),
    raw: node,
  };
}

function parseCobranca(cobrNode: unknown): Record<string, unknown> {
  const node = asObject(cobrNode);
  if (!node) return {};

  return {
    fat: asObject(readNode(node, 'fat')) ?? {},
    dup: asArray(readNode(node, 'dup')).map((d): Record<string, unknown> => {
      const dupObj = asObject(d) ?? {};
      return {
        nDup: readString(dupObj, 'nDup'),
        dVenc: readString(dupObj, 'dVenc'),
        vDup: normalizeNumber(readNode(dupObj, 'vDup')),
      };
    }),
    raw: node,
  };
}

function parsePagamento(pagNode: unknown): Record<string, unknown> {
  const node = asObject(pagNode);
  if (!node) return {};

  const detPag = asArray(readNode(node, 'detPag'));
  return {
    detPag: detPag.map((p): Record<string, unknown> => {
      const pObj = asObject(p) ?? {};
      const indPagRaw = readString(pObj, 'indPag');
      return {
        indPag: indPagMap[safe(indPagRaw, '')] || indPagRaw,
        tPag: readString(pObj, 'tPag'),
        vPag: normalizeNumber(readNode(pObj, 'vPag')),
        card: asObject(readNode(pObj, 'card')) ?? null,
      };
    }),
    vTroco: normalizeNumber(readNode(node, 'vTroco')),
    raw: node,
  };
}

function parseInfoAdicional(infAdicNode: unknown): Record<string, unknown> {
  const node = asObject(infAdicNode);
  if (!node) return {};

  return {
    infCpl: readString(node, 'infCpl'),
    infAdFisco: readString(node, 'infAdFisco'),
    obsCont: asArray(readNode(node, 'obsCont')).map((o): Record<string, unknown> => {
      const obj = asObject(o) ?? {};
      return { xCampo: readString(obj, 'xCampo'), xTexto: readString(obj, 'xTexto') };
    }),
    obsFisco: asArray(readNode(node, 'obsFisco')).map((o): Record<string, unknown> => {
      const obj = asObject(o) ?? {};
      return { xCampo: readString(obj, 'xCampo'), xTexto: readString(obj, 'xTexto') };
    }),
    raw: node,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class NfeParserService {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    parseTagValue: false,
  });

  /**
   * Recebe o conteúdo XML bruto de uma NF-e e retorna a estrutura DANFE parseada.
   * Lança erro se o XML não tiver estrutura de NF-e reconhecível.
   */
  parseNfeXml(xmlContent: string): Danfe {
    const parsedXml = this.xmlParser.parse(xmlContent) as unknown;
    const nfeRoot = findNfeRoot(parsedXml);

    if (!nfeRoot) {
      throw new Error('Estrutura de XML de NF-e nao reconhecida.');
    }

    const chave = String(safe(readNode(nfeRoot, '@_Id'), '')).replace(/^NFe/i, '');
    const versao = readString(nfeRoot, '@_versao');

    return {
      meta: { versao, chave },
      ide: parseIde(readNode(nfeRoot, 'ide')),
      emit: parseEmitente(readNode(nfeRoot, 'emit')),
      dest: parseDestinatario(readNode(nfeRoot, 'dest')),
      transp: parseTransporte(readNode(nfeRoot, 'transp')),
      cobr: parseCobranca(readNode(nfeRoot, 'cobr')),
      pag: parsePagamento(readNode(nfeRoot, 'pag')),
      total: parseTotais(readNode(nfeRoot, 'total')),
      infAdic: parseInfoAdicional(readNode(nfeRoot, 'infAdic')),
      det: parseItens(readNode(nfeRoot, 'det')),
      raw: nfeRoot,
    };
  }
}
