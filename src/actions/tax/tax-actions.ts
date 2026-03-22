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
    // Outros campos ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºteis
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
// 2. FUNÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ES AUXILIARES
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

const normalizeKey = (key: string): string =>
    key
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const getStringFromAliases = (item: Record<string, unknown>, aliases: string[]): string | null => {
    const target = new Set(aliases.map((alias) => normalizeKey(alias)));

    for (const [key, value] of Object.entries(item)) {
        const normalized = normalizeKey(key);
        const strValue = asString(value);

        if (target.has(normalized) && strValue) return strValue;

        if (value && typeof value === "object" && !Array.isArray(value)) {
            const nested = value as Record<string, unknown>;
            for (const [nestedKey, nestedValue] of Object.entries(nested)) {
                const nestedNormalized = normalizeKey(nestedKey);
                const nestedString = asString(nestedValue);
                if (target.has(nestedNormalized) && nestedString) return nestedString;
            }
        }
    }

    return null;
};

const parseNullableDateSafe = (value: unknown): Date | null => {
    const str = asString(value);
    if (!str) return null;
    const dt = new Date(str);
    return Number.isNaN(dt.getTime()) ? null : dt;
};

const toPrismaJson = (value: Record<string, unknown>): Prisma.InputJsonValue => {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const normalizeNcmDigits = (value: string | null): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    return digits.length === 8 ? digits : null;
};

const extractNcmCodesFromUnknown = (value: unknown, bag: Set<string>) => {
    if (Array.isArray(value)) {
        for (const item of value) extractNcmCodesFromUnknown(item, bag);
        return;
    }

    const record = asRecord(value);
    if (!record) return;

    const directNcm = getStringFromAliases(record, [
        "NCM",
        "ncm",
        "cNCM",
        "codNCM",
        "codigoNCM",
        "codigo_ncm",
    ]);
    const normalized = normalizeNcmDigits(directNcm);
    if (normalized) bag.add(normalized);

    for (const child of Object.values(record)) {
        if (typeof child === "object" && child !== null) {
            extractNcmCodesFromUnknown(child, bag);
        }
    }
};

const getAnexoExternalKey = (item: Record<string, unknown>, index: number): string => {
    const direct =
        getStringFromAliases(item, [
            "id",
            "codigo",
            "codAnexo",
            "cAnexo",
            "anexo",
            "chave",
            "externalKey",
            "external_key",
        ]) ??
        getStringFromAliases(item, ["code"]);

    if (direct) return direct;

    const hash = createHash("sha1").update(JSON.stringify(item)).digest("hex").slice(0, 16);
    return `anexo_${index}_${hash}`;
};

const getCredPresumidoExternalKey = (item: Record<string, unknown>, index: number): string => {
    const direct =
        getStringFromAliases(item, [
            "codOperacao",
            "cod_operacao",
            "id",
            "codigo",
            "codCredito",
            "cCredito",
            "credito",
            "chave",
            "externalKey",
            "external_key",
        ]) ??
        getStringFromAliases(item, ["code"]);

    if (direct) return direct;

    const hash = createHash("sha1").update(JSON.stringify(item)).digest("hex").slice(0, 16);
    return `cred_presumido_${index}_${hash}`;
};

const getNcmExternalKey = (item: Record<string, unknown>, index: number): string => {
    const possibleKeys = [
        item.codigo,
        item.Codigo,
        item.ncm,
        item.NCM,
        item.code,
        item.Code,
        item.id,
        item.ID,
    ];

    for (const key of possibleKeys) {
        const value = asString(key);
        if (value) return value.replace(/\D/g, "");
    }

    const hash = createHash("sha1").update(JSON.stringify(item)).digest("hex").slice(0, 16);
    return `ncm_${index}_${hash}`;
};

// ==============================================================================
// 3. SERVER ACTION (PROCESSAMENTO HIERÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂRQUICO)
// ==============================================================================
export async function saveTaxDataBatch(
    data: any[],
    options?: { revalidate?: boolean },
) {
    // Cast forÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ado para garantir intelisense aqui dentro, 
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
                // 2. SALVAR AS CLASSIFICAÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ES (FILHAS) DESTE CST
                // -------------------------------------------------------
                if (item.classificacoesTributarias && item.classificacoesTributarias.length > 0) {
                    for (const subItem of item.classificacoesTributarias) {

                        await tx.taxClassification.upsert({
                            where: { code: subItem.cClassTrib },

                            update: {
                                description: subItem.DescricaoClassTrib,
                                cstId: cstRecord.id, // Atualiza vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­nculo se mudar

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
                                cstId: cstRecord.id, // VÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNCULO FK

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

        if (options?.revalidate ?? true) {
            revalidatePath("/app/configuracoes");
        }

        return {
            success: true,
            message: `Sucesso! ${result.cst} CSTs e ${result.class} ClassificaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes processadas.`,
        };

    } catch (error: any) {
        console.error("Erro crÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­tico na importaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o fiscal:", error);
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

export async function saveTaxAnexosBatch(
    data: unknown[],
    options?: { isFirstChunk?: boolean; revalidate?: boolean },
): Promise<SaveResult> {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            success: true,
            message: "Nenhum anexo para processar.",
        };
    }

    try {
        if (options?.isFirstChunk) {
            // Limpa legados sem chave estavel (gerados por fallback antigo).
            await prisma.taxAnexo.deleteMany({
                where: {
                    externalKey: {
                        startsWith: "anexo_",
                    },
                },
            });
        }

        const normalized = data
            .map((item) => asRecord(item))
            .filter((item): item is Record<string, unknown> => item !== null);

        let count = 0;
        const chunkRefRows: Array<{ anexoId: string; ncm: string }> = [];
        const chunkAnexoIds = new Set<string>();

        // Evita transaction interativa longa (P2028) em cargas grandes.
        for (let index = 0; index < normalized.length; index++) {
            const item = normalized[index];
            const externalKey = getAnexoExternalKey(item, index);

            const code = getStringFromAliases(item, [
                "codigo",
                "codAnexo",
                "cAnexo",
                "anexo",
                "code",
                "codigo_anexo",
                "cod_anexo",
            ]);

            const title = getStringFromAliases(item, [
                "titulo",
                "nome",
                "descricaoCurta",
                "anexo",
                "title",
                "name",
            ]);

            const description = getStringFromAliases(item, [
                "descricao",
                "texto",
                "detalhe",
                "description",
                "textoLegal",
            ]);

            const category = getStringFromAliases(item, [
                "categoria",
                "tipo",
                "grupo",
                "category",
            ]);

            const publishDate =
                parseNullableDateSafe(getStringFromAliases(item, ["publicacao", "dataPublicacao", "publishDate", "dthPublicacao"]));
            const startDate =
                parseNullableDateSafe(getStringFromAliases(item, ["inicioVigencia", "dataInicioVigencia", "startDate", "dthIniVig"]));
            const endDate =
                parseNullableDateSafe(getStringFromAliases(item, ["fimVigencia", "dataFimVigencia", "endDate", "dthFimVig"]));

            const upserted = await prisma.taxAnexo.upsert({
                where: { externalKey },
                update: {
                    code,
                    title,
                    description,
                    category,
                    publishDate,
                    startDate,
                    endDate,
                    raw: toPrismaJson(item),
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
                    raw: toPrismaJson(item),
                },
                select: { id: true },
            });

            chunkAnexoIds.add(upserted.id);
            const ncmSet = new Set<string>();
            extractNcmCodesFromUnknown(item, ncmSet);
            for (const ncm of ncmSet) {
                chunkRefRows.push({ anexoId: upserted.id, ncm });
            }

            count++;
        }

        if (chunkAnexoIds.size > 0) {
            await prisma.taxAnexoNcm.deleteMany({
                where: {
                    anexoId: { in: Array.from(chunkAnexoIds) },
                },
            });

            if (chunkRefRows.length > 0) {
                await prisma.taxAnexoNcm.createMany({
                    data: chunkRefRows,
                    skipDuplicates: true,
                });
            }
        }

        if (options?.revalidate ?? true) {
            revalidatePath("/app/configuracoes");
        }

        return {
            success: true,
            message: `Sucesso! ${count} anexos processados.`,
        };
    } catch (error: any) {
        console.error("Erro crÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­tico na importaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de anexos fiscais:", error);
        return {
            success: false,
            error: `Erro ao salvar anexos no banco: ${error.message}`,
        };
    }
}

export async function saveTaxCredPresumidoBatch(
    data: unknown[],
    options?: { isFirstChunk?: boolean; revalidate?: boolean },
): Promise<SaveResult> {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            success: true,
            message: "Nenhum credito presumido para processar.",
        };
    }

    try {
        if (options?.isFirstChunk) {
            // Limpa legados sem chave estavel (gerados por fallback antigo).
            await prisma.taxCredPresumido.deleteMany({
                where: {
                    externalKey: {
                        startsWith: "cred_presumido_",
                    },
                },
            });
        }

        const normalized = data
            .map((item) => asRecord(item))
            .filter((item): item is Record<string, unknown> => item !== null);

        let count = 0;

        // Evita transaction interativa longa (P2028) em cargas grandes.
        for (let index = 0; index < normalized.length; index++) {
            const item = normalized[index];
            const externalKey = getCredPresumidoExternalKey(item, index);

            const code = getStringFromAliases(item, [
                "codOperacao",
                "cod_operacao",
                "codigo",
                "codCredito",
                "cCredito",
                "code",
            ]);

            const title = getStringFromAliases(item, [
                "nomeOperacao",
                "nome_operacao",
                "titulo",
                "nome",
                "credito",
                "title",
                "name",
            ]);

            const legalText = getStringFromAliases(item, ["texDispLegal", "textoDispLegal", "dispositivoLegal", "baseLegal"]);
            const operationLocation = getStringFromAliases(item, ["texLocalOperacao", "localOperacao"]);
            const supplierLocation = getStringFromAliases(item, ["texLocalFornec", "localFornecedor"]);
            const supplierProfile = getStringFromAliases(item, ["texCaractFornec", "caracteristicaFornecedor"]);

            const fallbackDescriptionParts = [
                legalText ? `Base legal: ${legalText}` : null,
                operationLocation ? `Local da operacao: ${operationLocation}` : null,
                supplierLocation ? `Local do fornecedor: ${supplierLocation}` : null,
                supplierProfile ? `Perfil do fornecimento: ${supplierProfile}` : null,
            ].filter((part): part is string => Boolean(part));

            const description =
                getStringFromAliases(item, ["descricao", "texto", "detalhe", "description"]) ??
                (fallbackDescriptionParts.length ? fallbackDescriptionParts.join(" | ") : null);

            const category =
                legalText ??
                getStringFromAliases(item, ["categoria", "tipo", "grupo", "category"]) ??
                null;

            const publishDate =
                parseNullableDateSafe(getStringFromAliases(item, ["dthPublicacao", "publicacao", "dataPublicacao", "publishDate"]));
            const startDate =
                parseNullableDateSafe(getStringFromAliases(item, ["dthIniVig", "inicioVigencia", "dataInicioVigencia", "startDate"]));
            const endDate =
                parseNullableDateSafe(getStringFromAliases(item, ["dthFimVig", "fimVigencia", "dataFimVigencia", "endDate"]));

            await prisma.taxCredPresumido.upsert({
                where: { externalKey },
                update: {
                    code,
                    title,
                    description,
                    category,
                    publishDate,
                    startDate,
                    endDate,
                    raw: toPrismaJson(item),
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
                    raw: toPrismaJson(item),
                },
            });

            count++;
        }

        if (options?.revalidate ?? true) {
            revalidatePath("/app/configuracoes");
        }

        return {
            success: true,
            message: `Sucesso! ${count} registros de credito presumido processados.`,
        };
    } catch (error: any) {
        console.error("Erro critico na importacao de credito presumido:", error);
        return {
            success: false,
            error: `Erro ao salvar credito presumido no banco: ${error.message}`,
        };
    }
}

export async function saveTaxNcmBatch(
    data: unknown[],
    options?: { revalidate?: boolean },
): Promise<SaveResult> {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            success: true,
            message: "Nenhum NCM para processar.",
        };
    }

    try {
        const normalized = data
            .map((item) => asRecord(item))
            .filter((item): item is Record<string, unknown> => item !== null);

        let count = 0;

        for (let index = 0; index < normalized.length; index++) {
            const item = normalized[index];
            const externalKey = getNcmExternalKey(item, index);

            const codeRaw =
                asString(item.codigo) ??
                asString(item.Codigo) ??
                asString(item.ncm) ??
                asString(item.NCM) ??
                asString(item.code) ??
                asString(item.Code) ??
                externalKey;

            const code = codeRaw.replace(/\D/g, "").slice(0, 8);
            if (!code) continue;

            const description =
                asString(item.descricao) ??
                asString(item.Descricao) ??
                asString(item.descricao_resumida) ??
                asString(item.description) ??
                "Sem descricao";

            const startDate =
                parseNullableDateSafe(item.data_inicio) ??
                parseNullableDateSafe(item.dataInicio) ??
                parseNullableDateSafe(item.inicioVigencia) ??
                parseNullableDateSafe(item.InicioVigencia);

            const endDate =
                parseNullableDateSafe(item.data_fim) ??
                parseNullableDateSafe(item.dataFim) ??
                parseNullableDateSafe(item.fimVigencia) ??
                parseNullableDateSafe(item.FimVigencia);

            const actType =
                asString(item.tipo_ato) ??
                asString(item.tipoAto) ??
                asString(item.tipo_legal);

            const actNumber =
                asString(item.numero_ato) ??
                asString(item.numeroAto) ??
                asString(item.num_ato);

            const actYear =
                asString(item.ano_ato) ??
                asString(item.anoAto);

            const replacedByCode =
                (asString(item.substituido_por) ??
                    asString(item.substituidoPor) ??
                    asString(item.replaced_by) ??
                    asString(item.replacedBy) ??
                    asString(item.ncmSubstituto) ??
                    "")
                    .replace(/\D/g, "")
                    .slice(0, 8) || null;

            await prisma.taxNcm.upsert({
                where: { code },
                update: {
                    externalKey,
                    description,
                    startDate,
                    endDate,
                    actType,
                    actNumber,
                    actYear,
                    replacedByCode,
                    raw: toPrismaJson(item),
                    lastUpdated: new Date(),
                },
                create: {
                    externalKey,
                    code,
                    description,
                    startDate,
                    endDate,
                    actType,
                    actNumber,
                    actYear,
                    replacedByCode,
                    raw: toPrismaJson(item),
                },
            });

            count++;
        }

        if (options?.revalidate ?? true) {
            revalidatePath("/app/configuracoes");
            revalidatePath("/app/reforma-tributaria");
        }

        return {
            success: true,
            message: `Sucesso! ${count} NCM(s) processado(s).`,
        };
    } catch (error: any) {
        console.error("Erro critico na importacao de NCM:", error);
        return {
            success: false,
            error: `Erro ao salvar NCM no banco: ${error.message}`,
        };
    }
}
