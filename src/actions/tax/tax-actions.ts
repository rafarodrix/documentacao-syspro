"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";

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
    IndCTeOS?: boolean;
    IndBPe?: boolean;
    IndNF3e?: boolean;
    IndNFCom?: boolean;
    IndNFSE: boolean;
    IndBPeTM?: boolean;
    IndBPeTA?: boolean;
    IndNFAg?: boolean;
    IndNFSVIA?: boolean;
    IndNFABI?: boolean;
    IndNFGas?: boolean;
    IndDERE?: boolean;

    // Monofasia + Anexo
    MonofasiaSujeitaRetencao?: boolean;
    MonofasiaRetidaAnt?: boolean;
    MonofasiaDiferimento?: boolean;
    MonofasiaPadrao?: boolean;
    Anexo?: string | null;
    // Outros campos ÃƒÆ’Ã‚Âºteis
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
// 2. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES AUXILIARES
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

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
};

const parseNullableDateSafe = (value: unknown): Date | null => {
    const str = asString(value);
    if (!str) return null;
    const dt = new Date(str);
    return Number.isNaN(dt.getTime()) ? null : dt;
};

const getAnexoExternalKey = (item: Record<string, unknown>, index: number): string => {
    const possibleKeys = [
        item.id,
        item.ID,
        item.codigo,
        item.Codigo,
        item.codAnexo,
        item.CodAnexo,
        item.cAnexo,
        item.anexo,
        item.Anexo,
        item.chave,
        item.Chave,
    ];

    for (const key of possibleKeys) {
        const value = asString(key);
        if (value) return value;
    }

    const hash = createHash("sha1").update(JSON.stringify(item)).digest("hex").slice(0, 16);
    return `anexo_${index}_${hash}`;
};

// ==============================================================================
// 3. SERVER ACTION (PROCESSAMENTO HIERÃƒÆ’Ã‚ÂRQUICO)
// ==============================================================================
export async function saveTaxDataBatch(data: any[]) {
    // Cast forÃƒÆ’Ã‚Â§ado para garantir intelisense aqui dentro, 
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
                // 2. SALVAR AS CLASSIFICAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES (FILHAS) DESTE CST
                // -------------------------------------------------------
                if (item.classificacoesTributarias && item.classificacoesTributarias.length > 0) {
                    for (const subItem of item.classificacoesTributarias) {

                        await tx.taxClassification.upsert({
                            where: { code: subItem.cClassTrib },

                            update: {
                                description: subItem.DescricaoClassTrib,
                                cstId: cstRecord.id, // Atualiza vÃƒÆ’Ã‚Â­nculo se mudar

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
                                indCTeOS: subItem.IndCTeOS ?? false,
                                indBPe: subItem.IndBPe ?? false,
                                indNF3e: subItem.IndNF3e ?? false,
                                indNFCom: subItem.IndNFCom ?? false,
                                indNFSe: subItem.IndNFSE, // Mapeado de IndNFSE -> indNFSe
                                indBPeTM: subItem.IndBPeTM ?? false,
                                indBPeTA: subItem.IndBPeTA ?? false,
                                indNFAg: subItem.IndNFAg ?? false,
                                indNFSVIA: subItem.IndNFSVIA ?? false,
                                indNFABI: subItem.IndNFABI ?? false,
                                indNFGas: subItem.IndNFGas ?? false,
                                indDERE: subItem.IndDERE ?? false,

                                monofasiaSujeitaRetencao: subItem.MonofasiaSujeitaRetencao ?? false,
                                monofasiaRetidaAnt: subItem.MonofasiaRetidaAnt ?? false,
                                monofasiaDiferimento: subItem.MonofasiaDiferimento ?? false,
                                monofasiaPadrao: subItem.MonofasiaPadrao ?? false,
                                anexo: subItem.Anexo,

                                // Datas
                                endDate: parseNullableDate(subItem.FimVigencia),
                            },

                            create: {
                                code: subItem.cClassTrib,
                                description: subItem.DescricaoClassTrib,
                                cstId: cstRecord.id, // VÃƒÆ’Ã‚ÂNCULO FK

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
                                indCTeOS: subItem.IndCTeOS ?? false,
                                indBPe: subItem.IndBPe ?? false,
                                indNF3e: subItem.IndNF3e ?? false,
                                indNFCom: subItem.IndNFCom ?? false,
                                indNFSe: subItem.IndNFSE,
                                indBPeTM: subItem.IndBPeTM ?? false,
                                indBPeTA: subItem.IndBPeTA ?? false,
                                indNFAg: subItem.IndNFAg ?? false,
                                indNFSVIA: subItem.IndNFSVIA ?? false,
                                indNFABI: subItem.IndNFABI ?? false,
                                indNFGas: subItem.IndNFGas ?? false,
                                indDERE: subItem.IndDERE ?? false,

                                monofasiaSujeitaRetencao: subItem.MonofasiaSujeitaRetencao ?? false,
                                monofasiaRetidaAnt: subItem.MonofasiaRetidaAnt ?? false,
                                monofasiaDiferimento: subItem.MonofasiaDiferimento ?? false,
                                monofasiaPadrao: subItem.MonofasiaPadrao ?? false,
                                anexo: subItem.Anexo,

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

        revalidatePath("/app/configuracoes");

        return {
            success: true,
            message: `Sucesso! ${result.cst} CSTs e ${result.class} ClassificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes processadas.`,
        };

    } catch (error: any) {
        console.error("Erro crÃƒÆ’Ã‚Â­tico na importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o fiscal:", error);
        return {
            success: false,
            error: `Erro ao salvar no banco: ${error.message}`,
        };
    }
}

type SaveResult = {
    success: boolean;
    message?: string;
    error?: string;
};

export async function saveTaxAnexosBatch(data: unknown[]): Promise<SaveResult> {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            success: true,
            message: "Nenhum anexo para processar.",
        };
    }

    try {
        const normalized = data
            .map((item) => asRecord(item))
            .filter((item): item is Record<string, unknown> => item !== null);

        const result = await prisma.$transaction(async (tx) => {
            let count = 0;

            for (let index = 0; index < normalized.length; index++) {
                const item = normalized[index];
                const externalKey = getAnexoExternalKey(item, index);

                const code =
                    asString(item.codigo) ??
                    asString(item.Codigo) ??
                    asString(item.codAnexo) ??
                    asString(item.CodAnexo) ??
                    asString(item.cAnexo) ??
                    null;

                const title =
                    asString(item.titulo) ??
                    asString(item.Titulo) ??
                    asString(item.nome) ??
                    asString(item.Nome) ??
                    asString(item.anexo) ??
                    asString(item.Anexo) ??
                    null;

                const description =
                    asString(item.descricao) ??
                    asString(item.Descricao) ??
                    asString(item.texto) ??
                    asString(item.Texto) ??
                    null;

                const category =
                    asString(item.categoria) ??
                    asString(item.Categoria) ??
                    asString(item.tipo) ??
                    asString(item.Tipo) ??
                    null;

                const publishDate =
                    parseNullableDateSafe(item.publicacao) ??
                    parseNullableDateSafe(item.Publicacao);
                const startDate =
                    parseNullableDateSafe(item.inicioVigencia) ??
                    parseNullableDateSafe(item.InicioVigencia);
                const endDate =
                    parseNullableDateSafe(item.fimVigencia) ??
                    parseNullableDateSafe(item.FimVigencia);

                await tx.taxAnexo.upsert({
                    where: { externalKey },
                    update: {
                        code,
                        title,
                        description,
                        category,
                        publishDate,
                        startDate,
                        endDate,
                        raw: item,
                        lastUpdated: new Date(),
                    },
                    create: {
                        externalKey,
                        code,
                        title,
                        description,
                        category,
                        publishDate,
                        startDate,
                        endDate,
                        raw: item,
                    },
                });

                count++;
            }

            return { count };
        });

        revalidatePath("/app/configuracoes");

        return {
            success: true,
            message: `Sucesso! ${result.count} anexos processados.`,
        };
    } catch (error: any) {
        console.error("Erro crÃƒÆ’Ã‚Â­tico na importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de anexos fiscais:", error);
        return {
            success: false,
            error: `Erro ao salvar anexos no banco: ${error.message}`,
        };
    }
}
