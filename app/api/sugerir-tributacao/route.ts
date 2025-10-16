// Rota API para sugerir tributação com base em CSTs e alíquotas.
// Retorna um código padronizado e uma explicação detalhada para apoiar o lançamento fiscal.

import { NextResponse } from 'next/server'

// Define a estrutura esperada no corpo da requisição
interface RequestBody {
    cstIcms: string;
    pIcms?: string;
    cstPis: string;
    cstCofins: string;
}

// Define a estrutura do objeto de retorno das funções auxiliares
interface TributacaoResult {
    codigo: string;
    motivo: string;
}

/**
 * Interpreta o CST/CSOSN de ICMS e retorna um código padrão com explicação.
 */
function getIcmsInfo(cstIcms: string, pIcmsStr?: string): TributacaoResult {
    const pIcms = parseFloat(pIcmsStr || '0');
    // Não usa padStart para lidar corretamente com CST (2 dígitos) e CSOSN (3 dígitos)
    const cst = cstIcms;

    if (['00', '90'].includes(cst)) {
        return {
            codigo: `T${Math.round(pIcms)}%`,
            motivo: `ICMS tributado integralmente à alíquota de ${pIcms}% (CST ${cst}).`,
        };
    }
    if (cst === '20') {
        return {
            codigo: `T${Math.round(pIcms)}%`,
            motivo: `ICMS com redução de base de cálculo, tributado a ${pIcms}% (CST 20).`,
        };
    }
    if (['10', '30', '70'].includes(cst)) {
        return {
            codigo: 'ST',
            motivo: `ICMS com substituição tributária (CST ${cst}).`,
        };
    }
    if (cst === '60') {
        return {
            codigo: 'ST',
            motivo: `ICMS ST já recolhido anteriormente (CST ${cst}).`,
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
            codigo: 'IS', // Isento / Imune / Sem Incidência
            motivo: `Operação isenta, não tributada ou imune de ICMS (CST ${cst}).`,
        };
    }
    if (['101', '201'].includes(cst)) {
        return {
            codigo: 'SN C/C', // Simples Nacional Com Crédito
            motivo: `Empresa do Simples Nacional que permite crédito de ICMS (CSOSN ${cst}).`,
        };
    }
    if (['102', '103', '300', '400'].includes(cst)) {
        return {
            codigo: 'SN S/C', // Simples Nacional Sem Crédito
            motivo: `Empresa do Simples Nacional que não permite crédito de ICMS (CSOSN ${cst}).`,
        };
    }
     if (['202', '203', '500', '900'].includes(cst)) {
        return {
            codigo: 'SN ST', // Simples Nacional com ST ou outros
            motivo: `Operação do Simples Nacional com substituição tributária ou outras (CSOSN ${cst}).`,
        };
    }

    return {
        codigo: 'OUTROS',
        motivo: `Operação com tratamento específico ou não identificado para CST/CSOSN ${cst}.`,
    };
}

/**
 * Interpreta o CST de PIS/COFINS e retorna um sufixo padrão.
 */
function getPisCofinsInfo(cstPis: string, cstCofins: string): TributacaoResult {
    const pis = cstPis.padStart(2, '0');

    switch (pis) {
        case '01': case '02':
            return {
                codigo: `P/C TRIBUT.`,
                motivo: `PIS/COFINS tributado (CST ${pis}).`,
            };
        case '03': case '04': case '05': case '06': case '07': case '08': case '09':
             return {
                codigo: 'P/C ISENTO/NT',
                motivo: `Operação isenta, NT, alíquota zero ou monofásica para PIS/COFINS (CST ${pis}).`,
            };
        case '49': case '98': case '99':
            return {
                codigo: 'P/C OUTRAS',
                motivo: `PIS/COFINS com outras operações de saída (CST ${pis}).`,
            };
        // CSTs de entrada com direito a crédito
        case '50': case '51': case '52': case '53': case '54': case '55': case '56':
             return {
                codigo: 'P/C C/C', // Com Crédito
                motivo: `Operação de entrada com direito a crédito de PIS/COFINS (CST ${pis}).`,
            };
        // CSTs de entrada sem direito a crédito
        case '70': case '71': case '72': case '73': case '74': case '75':
            return {
                codigo: 'P/C S/C', // Sem Crédito
                motivo: `Operação de entrada sem direito a crédito de PIS/COFINS (CST ${pis}).`,
            };
        default:
            return {
                codigo: `P/C PADRÃO`,
                motivo: `Tratamento padrão para PIS/COFINS (CST ${pis}).`,
            };
    }
}


export async function POST(request: Request) {
    try {
        const body: RequestBody = await request.json();
        const { cstIcms, pIcms, cstPis, cstCofins } = body;

        if (!cstIcms || !cstPis || !cstCofins) {
            return NextResponse.json({ error: 'Os campos cstIcms, cstPis e cstCofins são obrigatórios.' }, { status: 400 });
        }

        const icms = getIcmsInfo(cstIcms, pIcms);
        const pisCofins = getPisCofinsInfo(cstPis, cstCofins);

        const sugestao = `${icms.codigo} | ${pisCofins.codigo}`;
        const informacao = `${icms.motivo} ${pisCofins.motivo}`;

        return NextResponse.json({
            sugestao,
            informacao,
            detalhes: {
                icms: icms,
                pisCofins: pisCofins,
            },
        });
    } catch (error) {
        console.error('Erro na sugestão de tributação:', error);
        return NextResponse.json({ error: 'Falha ao processar a sugestão de tributação.' }, { status: 500 });
    }
}