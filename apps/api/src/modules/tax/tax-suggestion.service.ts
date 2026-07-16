import { Injectable } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface TaxSuggestionInput {
  cstIcms: string;
  pIcms?: string;
  cstPis: string;
  cstCofins: string;
}

interface TributacaoResult {
  codigo: string;
  motivo: string;
}

interface TaxSuggestionResult {
  sugestao: string;
  informacao: string;
  detalhes: {
    icms: TributacaoResult;
    pisCofins: TributacaoResult;
  };
}

// ---------------------------------------------------------------------------
// Regras de negócio fiscal
// ---------------------------------------------------------------------------

function getIcmsInfo(cstIcms: string, pIcmsStr?: string): TributacaoResult {
  const pIcms = parseFloat(pIcmsStr || '0');
  const cst = cstIcms;

  if (['00', '90'].includes(cst)) {
    return {
      codigo: `T${Math.round(pIcms)}%`,
      motivo: `ICMS tributado integralmente a aliquota de ${pIcms}% (CST ${cst}).`,
    };
  }
  if (cst === '20') {
    return {
      codigo: `T${Math.round(pIcms)}%`,
      motivo: `ICMS com reducao de base de calculo, tributado a ${pIcms}% (CST 20).`,
    };
  }
  if (['10', '30', '70'].includes(cst)) {
    return {
      codigo: 'ST',
      motivo: `ICMS com substituicao tributaria (CST ${cst}).`,
    };
  }
  if (cst === '60') {
    return {
      codigo: 'ST',
      motivo: `ICMS ST ja recolhido anteriormente (CST ${cst}).`,
    };
  }
  if (cst === '51') {
    return {
      codigo: 'DF',
      motivo: `ICMS com diferimento (CST 51).`,
    };
  }
  if (['40', '41', '50'].includes(cst)) {
    return {
      codigo: 'IS',
      motivo: `Operacao isenta, nao tributada ou imune de ICMS (CST ${cst}).`,
    };
  }
  if (['101', '201'].includes(cst)) {
    return {
      codigo: 'SN C/C',
      motivo: `Empresa do Simples Nacional que permite credito de ICMS (CSOSN ${cst}).`,
    };
  }
  if (['102', '103', '300', '400'].includes(cst)) {
    return {
      codigo: 'SN S/C',
      motivo: `Empresa do Simples Nacional que nao permite credito de ICMS (CSOSN ${cst}).`,
    };
  }
  if (['202', '203', '500', '900'].includes(cst)) {
    return {
      codigo: 'SN ST',
      motivo: `Operacao do Simples Nacional com substituicao tributaria ou outras (CSOSN ${cst}).`,
    };
  }

  return {
    codigo: 'OUTROS',
    motivo: `Operacao com tratamento especifico ou nao identificado para CST/CSOSN ${cst}.`,
  };
}

function getPisCofinsInfo(cstPis: string, _cstCofins: string): TributacaoResult {
  const pis = cstPis.padStart(2, '0');

  switch (pis) {
    case '01':
    case '02':
      return {
        codigo: 'P/C TRIBUT.',
        motivo: `PIS/COFINS tributado (CST ${pis}).`,
      };
    case '03':
    case '04':
    case '05':
    case '06':
    case '07':
    case '08':
    case '09':
      return {
        codigo: 'P/C ISENTO/NT',
        motivo: `Operacao isenta, NT, aliquota zero ou monofasica para PIS/COFINS (CST ${pis}).`,
      };
    case '49':
    case '98':
    case '99':
      return {
        codigo: 'P/C OUTRAS',
        motivo: `PIS/COFINS com outras operacoes de saida (CST ${pis}).`,
      };
    case '50':
    case '51':
    case '52':
    case '53':
    case '54':
    case '55':
    case '56':
      return {
        codigo: 'P/C C/C',
        motivo: `Operacao de entrada com direito a credito de PIS/COFINS (CST ${pis}).`,
      };
    case '70':
    case '71':
    case '72':
    case '73':
    case '74':
    case '75':
      return {
        codigo: 'P/C S/C',
        motivo: `Operacao de entrada sem direito a credito de PIS/COFINS (CST ${pis}).`,
      };
    default:
      return {
        codigo: 'P/C PADRAO',
        motivo: `Tratamento padrao para PIS/COFINS (CST ${pis}).`,
      };
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TaxSuggestionService {
  /**
   * Retorna uma sugestão de classificação tributária com base nos CSTs informados.
   */
  suggest(input: TaxSuggestionInput): TaxSuggestionResult {
    const icms = getIcmsInfo(input.cstIcms, input.pIcms);
    const pisCofins = getPisCofinsInfo(input.cstPis, input.cstCofins);

    return {
      sugestao: `${icms.codigo} | ${pisCofins.codigo}`,
      informacao: `${icms.motivo} ${pisCofins.motivo}`,
      detalhes: {
        icms,
        pisCofins,
      },
    };
  }
}
