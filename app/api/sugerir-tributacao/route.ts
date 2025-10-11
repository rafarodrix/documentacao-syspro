// Rota API para sugerir tributação com base em CSTs e alíquotas
// Recebe CSTs de ICMS, PIS e COFINS e retorna uma sugestão padronizada
// para uso no sistema, junto com uma explicação dos motivos

import { NextResponse } from 'next/server'

function getIcmsPrefix(cstIcms: string, pIcmsStr?: string): { prefixo: string; motivo: string } {
  const pIcms = parseFloat(pIcmsStr || '0');
  const cst = cstIcms.padStart(2, '0'); 

  switch (true) {
    // Tributado integralmente (00, 90)
    case ['00', '90'].includes(cst):
      return {
        prefixo: `T${Math.round(pIcms)}%`,
        motivo: `ICMS tributado integralmente (${pIcms}%)`,
      };

    // Tributado com redução de base (20)
    case cst === '20':
      return {
        prefixo: `T${Math.round(pIcms)}%`,
        motivo: `ICMS tributado com redução de base (${pIcms}% sobre base reduzida)`,
      };

    // Substituição tributária
    case ['10', '30', '60', '70'].includes(cst):
      return {
        prefixo: 'FF',
        motivo: 'ICMS com substituição tributária',
      };

    // Diferimento parcial
    case cst === '51':
      return {
        prefixo: 'FF',
        motivo: 'ICMS com diferimento parcial (CST 51)',
      };

    // Isento/Imune
    case ['40', '41', '50'].includes(cst):
      return {
        prefixo: 'II',
        motivo: 'Operação isenta ou imune de ICMS',
      };

    // Outras situações não tributadas
    default:
      return {
        prefixo: 'NN',
        motivo: 'Operação não tributada ou sem incidência de ICMS',
      };
  }
}
/**
 * Retorna o sufixo de PIS/COFINS conforme os CSTs combinados.
 */
function getPisCofinsSuffix(cstPis: string, cstCofins: string): { sufixo: string; motivo: string } {
  // Ambos tributados normalmente
  if (['01', '02'].includes(cstPis) && ['01', '02'].includes(cstCofins)) {
    return {
      sufixo: `PIS E COFINS 50 | ${cstPis}`,
      motivo: 'PIS/COFINS tributados normalmente',
    }
  }

  // Monofásico ou substituição tributária
  if (['03'].includes(cstPis) || ['03'].includes(cstCofins)) {
    return {
      sufixo: `PIS E COFINS 70 | 03`,
      motivo: 'PIS/COFINS monofásico ou por substituição tributária',
    }
  }

  // Isenção, alíquota zero, não tributado
  if (['04', '05', '06', '07', '08', '09'].includes(cstPis)) {
    return {
      sufixo: `PIS E COFINS 70 | ${cstPis}`,
      motivo: 'PIS/COFINS isento, alíquota zero ou não tributado',
    }
  }

  // Outras combinações – genérico
  return {
    sufixo: `PIS E COFINS 50 | ${cstPis}`,
    motivo: 'Tratamento padrão de PIS/COFINS',
  }
}

/**
 * Função principal da API – gera sugestão de tributação
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cstIcms, pIcms, cstPis, cstCofins } = body

    if (!cstIcms || !cstPis || !cstCofins) {
      return NextResponse.json(
        { error: 'CSTs de ICMS, PIS e COFINS são obrigatórios.' },
        { status: 400 }
      )
    }

    const icms = getIcmsPrefix(cstIcms, pIcms)
    const pisCofins = getPisCofinsSuffix(cstPis, cstCofins)

    // Monta a descrição completa e padronizada
    const descricao = `${icms.prefixo} | ${pisCofins.sufixo}`
    const informacao = `${icms.motivo} | ${pisCofins.motivo}`

    return NextResponse.json({
      sugestao: descricao,
      detalhes: {
        icms: icms.motivo,
        pisCofins: pisCofins.motivo,
      },
      informacao,
    })
  } catch (error) {
    console.error('Erro na sugestão de tributação:', error)
    return NextResponse.json(
      { error: 'Falha ao processar a sugestão.' },
      { status: 500 }
    )
  }
}
