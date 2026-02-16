"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// ==============================================================================
// 1. TIPAGEM EXATA DO RETORNO DA API (BASEADA NO SEU JSON)
// ==============================================================================

type TaxClassificationDTO = {
    cClassTrib: string;
    DescricaoClassTrib: string;
    pRedIBS: number;
    pRedCBS: number;

    // Indicadores
    IndTribRegular: boolean;
    IndCredPresOper: boolean;
    IndEstornoCred: boolean;

    // Flags de Documentos
    IndNFe: boolean;
    IndNFCe: boolean;
    IndCTe: boolean;
    IndNFSE: boolean; // Note que a API manda 'NFSE' (tudo maiúsculo no final)

    // Outros campos úteis
    TipoAliquota: string;
    Link: string | null;

    // Datas
    Publicacao: string;
    InicioVigencia: string;
    FimVigencia: string | null;
};

type TaxCstDTO = {
    CST: string;
    DescricaoCST: string;

    // Flags CST
    IndIBSCBS: boolean;
    IndRedBC: boolean;
    IndRedAliq: boolean;
    IndTransfCred: boolean;
    IndDif: boolean;
    IndAjusteCompet: boolean;
    IndIBSCBSMono: boolean;
    IndCredPresIBSZFM: boolean;

    // Datas CST
    Publicacao: string;
    InicioVigencia: string;
    FimVigencia: string | null;

    // ARRAY DE FILHOS
    classificacoesTributarias: TaxClassificationDTO[];
};

// ==============================================================================
// 2. FUNÇÕES AUXILIARES
// ==============================================================================
const parseDate = (dateStr?: string | null) => {
    if (!dateStr) return new Date();
    return new Date(dateStr);
};

const parseNullableDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr);
};

const parseDecimal = (val?: number | string) => {
    if (val === undefined || val === null) return new Prisma.Decimal(0);
    return new Prisma.Decimal(val);
};

// ==============================================================================
// 3. SERVER ACTION (PROCESSAMENTO HIERÁRQUICO)
// ==============================================================================
export async function saveTaxDataBatch(data: any[]) {
    // Cast forçado para garantir intelisense aqui dentro, 
    // assumindo que o input vem correto do front
    const cstList = data as TaxCstDTO[];

    try {
        console.log(`[Sync] Iniciando processamento de ${cstList.length} CSTs...`);

        const result = await prisma.$transaction(async (tx) => {
            let countCST = 0;
            let countClass = 0;

            for (const item of cstList) {
                // -------------------------------------------------------
                // 1. SALVAR O CST (PAI)
                // -------------------------------------------------------
                const cstRecord = await tx.taxCST.upsert({
                    where: { cst: item.CST },
                    update: {
                        description: item.DescricaoCST,
                        indIBSCBS: item.IndIBSCBS,
                        indRedBC: item.IndRedBC,
                        indRedAliq: item.IndRedAliq,
                        indTransfCred: item.IndTransfCred,
                        indDif: item.IndDif,
                        indAjusteCompet: item.IndAjusteCompet,
                        indIBSCBSMono: item.IndIBSCBSMono,
                        indCredPresIBSZFM: item.IndCredPresIBSZFM,
                        endDate: parseNullableDate(item.FimVigencia),
                        lastUpdated: new Date()
                    },
                    create: {
                        cst: item.CST,
                        description: item.DescricaoCST,

                        // Flags
                        indIBSCBS: item.IndIBSCBS,
                        indRedBC: item.IndRedBC,
                        indRedAliq: item.IndRedAliq,
                        indTransfCred: item.IndTransfCred,
                        indDif: item.IndDif,
                        indAjusteCompet: item.IndAjusteCompet,
                        indIBSCBSMono: item.IndIBSCBSMono,
                        indCredPresIBSZFM: item.IndCredPresIBSZFM,

                        // Datas
                        publishDate: parseDate(item.Publicacao),
                        startDate: parseDate(item.InicioVigencia),
                        endDate: parseNullableDate(item.FimVigencia),
                    }
                });
                countCST++;

                // -------------------------------------------------------
                // 2. SALVAR AS CLASSIFICAÇÕES (FILHAS) DESTE CST
                // -------------------------------------------------------
                if (item.classificacoesTributarias && item.classificacoesTributarias.length > 0) {
                    for (const subItem of item.classificacoesTributarias) {

                        await tx.taxClassification.upsert({
                            where: { code: subItem.cClassTrib },

                            update: {
                                description: subItem.DescricaoClassTrib,
                                cstId: cstRecord.id, // Atualiza vínculo se mudar

                                pRedIBS: parseDecimal(subItem.pRedIBS),
                                pRedCBS: parseDecimal(subItem.pRedCBS),
                                tipoAliquota: subItem.TipoAliquota,
                                link: subItem.Link,

                                // Flags
                                indTribRegular: subItem.IndTribRegular,
                                indCredPresOper: subItem.IndCredPresOper,
                                indEstornoCred: subItem.IndEstornoCred,

                                // Docs
                                indNFe: subItem.IndNFe,
                                indNFCe: subItem.IndNFCe,
                                indCTe: subItem.IndCTe,
                                indNFSe: subItem.IndNFSE, // Mapeado de IndNFSE -> indNFSe

                                // Datas
                                endDate: parseNullableDate(subItem.FimVigencia),
                            },

                            create: {
                                code: subItem.cClassTrib,
                                description: subItem.DescricaoClassTrib,
                                cstId: cstRecord.id, // VÍNCULO FK

                                pRedIBS: parseDecimal(subItem.pRedIBS),
                                pRedCBS: parseDecimal(subItem.pRedCBS),
                                tipoAliquota: subItem.TipoAliquota,
                                link: subItem.Link,

                                // Flags
                                indTribRegular: subItem.IndTribRegular,
                                indCredPresOper: subItem.IndCredPresOper,
                                indEstornoCred: subItem.IndEstornoCred,

                                // Docs
                                indNFe: subItem.IndNFe,
                                indNFCe: subItem.IndNFCe,
                                indCTe: subItem.IndCTe,
                                indNFSe: subItem.IndNFSE,

                                // Datas
                                publishDate: parseDate(subItem.Publicacao),
                                startDate: parseDate(subItem.InicioVigencia),
                                endDate: parseNullableDate(subItem.FimVigencia),
                            }
                        });
                        countClass++;
                    }
                }
            }
            return { cst: countCST, class: countClass };
        }, {
            maxWait: 20000,
            timeout: 60000 // 60s timeout, pois pode haver muitos registros
        });

        revalidatePath("/admin/settings");

        return {
            success: true,
            message: `Sucesso! ${result.cst} CSTs e ${result.class} Classificações processadas.`,
        };

    } catch (error: any) {
        console.error("Erro crítico na importação fiscal:", error);
        return {
            success: false,
            error: `Erro ao salvar no banco: ${error.message}`,
        };
    }
}