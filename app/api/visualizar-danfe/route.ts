import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Mapa para traduzir o código da modalidade de frete
const modFreteMap: { [key: string]: string } = {
  '0': '0 - Por conta do Emitente (CIF)',
  '1': '1 - Por conta do Destinatário (FOB)',
  '2': '2 - Por conta de Terceiros',
  '3': '3 - Transporte Próprio (Remetente)',
  '4': '4 - Transporte Próprio (Destinatário)',
  '9': '9 - Sem Transporte',
};

// Mapa para traduzir o tipo de operação da NF-e
const tpNFMap: { [key: string]: string } = {
    '0': '0 - Entrada',
    '1': '1 - Saída',
};

// Função auxiliar para formatar endereços
const formatAddress = (ender: any) => {
    if (!ender) return '';
    const parts = [ender.xLgr, ender.nro];
    if (ender.xBairro) parts.push(ender.xBairro);
    if (ender.xMun && ender.UF) parts.push(`${ender.xMun}/${ender.UF}`);
    if (ender.CEP) parts.push(`CEP: ${ender.CEP}`);
    return parts.filter(Boolean).join(', ');
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const fileContent = await file.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonObj = parser.parse(fileContent);
    const nfeData = jsonObj.nfeProc?.NFe?.infNFe || jsonObj.NFe?.infNFe;

    if (!nfeData) {
      return NextResponse.json({ error: 'Estrutura de XML de NF-e não encontrada ou inválida.' }, { status: 400 });
    }

    const detArray = Array.isArray(nfeData.det) ? nfeData.det : (nfeData.det ? [nfeData.det] : []);
    const items = detArray.map((item: any) => {
      const prod = item.prod || {};
      const imposto = item.imposto || {};
      const icmsNode = Object.values(imposto.ICMS || {}).find(node => typeof node === 'object') as any || {};
      const ipiNodeContainer = imposto.IPI || {};
      const ipiNode = ipiNodeContainer.IPITrib || ipiNodeContainer.IPINT || {}; 
      const pisNode = imposto.PIS ? (imposto.PIS.PISAliq || imposto.PIS.PISOutr || imposto.PIS.PISNT || {}) : {};
      const cofinsNode = imposto.COFINS ? (imposto.COFINS.COFINSAliq || imposto.COFINS.COFINSOutr || imposto.COFINS.COFINSNT || {}) : {};

      return {
        // Dados do Produto
        cProd: prod.cProd, xProd: prod.xProd, NCM: prod.NCM, CFOP: prod.CFOP,
        qCom: prod.qCom, vUnCom: prod.vUnCom, vProd: prod.vProd,
        vFrete: prod.vFrete, vSeg: prod.vSeg, vOutro: prod.vOutro,
        
        // Dados do ICMS
        CST_ICMS: icmsNode.CST || icmsNode.CSOSN,
        vBC: icmsNode.vBC, pICMS: icmsNode.pICMS, vICMS: icmsNode.vICMS,
        pRedBC: icmsNode.pRedBC,
        
        // Dados do ICMS ST
        vBCST: icmsNode.vBCST, pMVAST: icmsNode.pMVAST, pICMSST: icmsNode.pICMSST, vICMSST: icmsNode.vICMSST,
        pRedBCST: icmsNode.pRedBCST,

        // Dados do IPI
        CST_IPI: ipiNode.CST,
        vIPI: ipiNode.vIPI,

        // Dados do PIS
        CST_PIS: pisNode.CST,
        pPIS: pisNode.pPIS, vPIS: pisNode.vPIS,

        // Dados do COFINS
        CST_COFINS: cofinsNode.CST,
        pCOFINS: cofinsNode.pCOFINS, vCOFINS: cofinsNode.vCOFINS,
      };
    });

    const dupArray = Array.isArray(nfeData.cobr?.dup) ? nfeData.cobr.dup : (nfeData.cobr?.dup ? [nfeData.cobr.dup] : []);

    const danfe = {
      ide: {
        nNF: nfeData.ide?.nNF || '',
        serie: nfeData.ide?.serie || '',
        dhEmi: nfeData.ide?.dhEmi || '',
        natOp: nfeData.ide?.natOp || '',
        CFOP: nfeData.ide?.CFOP || '',
        mod: nfeData.ide?.mod || '',
        tpNF: tpNFMap[nfeData.ide?.tpNF] || nfeData.ide?.tpNF || '',
        cNF: nfeData.ide?.cNF || '',
      },
      emit: {
          xNome: nfeData.emit?.xNome || '',
          CNPJ: nfeData.emit?.CNPJ || '',
          IE: nfeData.emit?.IE || '',
          enderEmit: formatAddress(nfeData.emit?.enderEmit),
          UF: nfeData.emit?.enderEmit?.UF,
      },
      dest: {
          xNome: nfeData.dest?.xNome || '',
          doc: nfeData.dest?.CNPJ || nfeData.dest?.CPF || '',
          IE: nfeData.dest?.IE || '',
          enderDest: formatAddress(nfeData.dest?.enderDest),
          UF: nfeData.dest?.enderDest?.UF,
      },
      transp: {
        modFrete: modFreteMap[nfeData.transp?.modFrete] || nfeData.transp?.modFrete,
        transporta: nfeData.transp?.transporta,
        veicTransp: nfeData.transp?.veicTransp,
        vol: Array.isArray(nfeData.transp?.vol) ? nfeData.transp.vol : (nfeData.transp?.vol ? [nfeData.transp.vol] : []),
      },
      det: items,
      total: nfeData.total?.ICMSTot,
      cobr: dupArray,
      infAdic: {
        infCpl: nfeData.infAdic?.infCpl,
        infAdFisco: nfeData.infAdic?.infAdFisco,
      },
      chave: nfeData['@_Id']?.replace('NFe', '') || '',
    };

    return NextResponse.json(danfe);
  } catch (error) {
    console.error('Erro ao processar XML:', error);
    return NextResponse.json({ error: 'Falha ao processar o arquivo XML. Verifique se é um XML de NF-e válido.' }, { status: 500 });
  }
}