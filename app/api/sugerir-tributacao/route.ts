import { NextResponse } from 'next/server';

/**
 * Mapeia o CST do ICMS e a alíquota para o prefixo do ERP (T18%, FF, II, NN).
 */
function getIcmsPrefix(cstIcms: string, pIcmsStr: string): string {
    const pIcms = parseFloat(pIcmsStr || '0');

    // Regra para Tributado (Txx%)
    if (['00', '20'].includes(cstIcms)) {
        if (pIcms > 0) {
            return `T${Math.round(pIcms)}%`;
        }
        return 'T0%'; // Caso seja tributado mas com alíquota zero
    }
    // Regra para Substituição Tributária (FF)
    if (['10', '30', '60', '70'].includes(cstIcms)) {
        return 'FF';
    }
    // Regra para Isento/Imune (II)
    if (['40', '41', '50'].includes(cstIcms)) {
        return 'II';
    }
    // Regra para Não Tributado (NN) e outros casos
    return 'NN';
}

/**
 * Mapeia os CSTs de PIS/COFINS para o sufixo do ERP (PIS E COFINS 50 | 01).
 * Esta é uma suposição baseada na sua imagem. VALIDE ESTA REGRA!
 */
function getPisCofinsSuffix(cstPis: string, cstCofins: string): string {
    // Exemplo de regra: Se CST de PIS for monofásico, isento, alíquota zero, etc.
    if (['04', '05', '06', '07', '08', '09'].includes(cstPis)) {
        // Usa o grupo "70" do seu ERP
        return `PIS E COFINS 70 | ${cstPis}`;
    }
    // Para todas as outras operações (tributadas, etc.), usa o grupo "50"
    return `PIS E COFINS 50 | ${cstPis}`;
}

// --- FIM DAS REGRAS DE MAPEAMENTO ---


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cstIcms, pIcms, cstPis, cstCofins } = body;

        if (!cstIcms || !cstPis || !cstCofins) {
            return NextResponse.json({ error: 'CSTs de ICMS, PIS e COFINS são obrigatórios.' }, { status: 400 });
        }
        
        const icmsPrefix = getIcmsPrefix(cstIcms, pIcms);
        const pisCofinsSuffix = getPisCofinsSuffix(cstPis, cstCofins);

        // Monta a sugestão final
        const sugestao = `${icmsPrefix} | ${pisCofinsSuffix}`;

        return NextResponse.json({ sugestao });

    } catch (error) {
        console.error("Erro na sugestão de tributação:", error);
        return NextResponse.json({ error: 'Falha ao processar a sugestão.' }, { status: 500 });
    }
}