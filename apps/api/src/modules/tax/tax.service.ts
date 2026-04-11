import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type TaxSyncMode = 'classTrib' | 'anexos' | 'credPresumido' | 'ncm';

type TaxSyncChunkRequest = {
  mode?: TaxSyncMode;
  chunk?: unknown[];
  chunkIndex?: number;
  totalChunks?: number;
  totalItems?: number;
  source?: string;
  fetchedAt?: number;
  jobId?: string;
};

type TaxClassificationDTO = {
  cClassTrib: string;
  DescricaoClassTrib: string;
  pRedIBS: number;
  pRedCBS: number;
  IndTribRegular: boolean;
  IndCredPresOper: boolean;
  IndEstornoCred: boolean;
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
  MonofasiaSujeitaRetencao?: boolean;
  MonofasiaRetidaAnt?: boolean;
  MonofasiaDiferimento?: boolean;
  MonofasiaPadrao?: boolean;
  Anexo?: string | null;
  TipoAliquota: string;
  Link: string | null;
  Publicacao: string;
  InicioVigencia: string;
  FimVigencia: string | null;
};

type TaxCstDTO = {
  CST: string;
  DescricaoCST: string;
  IndIBSCBS: boolean;
  IndRedBC: boolean;
  IndRedAliq: boolean;
  IndTransfCred: boolean;
  IndDif: boolean;
  IndAjusteCompet: boolean;
  IndIBSCBSMono: boolean;
  IndCredPresIBSZFM: boolean;
  Publicacao: string;
  InicioVigencia: string;
  FimVigencia: string | null;
  classificacoesTributarias: TaxClassificationDTO[];
};

type TaxActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  failed?: number;
};

type NcmClassMapRowInput = {
  ncm: string;
  classCode: string | null;
  cstCode: string | null;
  anexoCode: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

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

const parseNullableString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const normalizeKey = (key: string): string =>
  key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getStringFromAliases = (item: Record<string, unknown>, aliases: string[]): string | null => {
  const target = new Set(aliases.map((alias) => normalizeKey(alias)));
  const queue: unknown[] = [item];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) queue.push(entry);
      continue;
    }

    const record = current as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const normalized = normalizeKey(key);
      const strValue = asString(value);
      if (target.has(normalized) && strValue) return strValue;
      if (value && typeof value === 'object') queue.push(value);
    }
  }

  return null;
};

const getAnyMeaningfulString = (item: Record<string, unknown>): string | null => {
  const queue: unknown[] = [item];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) queue.push(entry);
      continue;
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      const str = asString(value);
      if (str && str.length >= 3) return str;
      if (value && typeof value === 'object') queue.push(value);
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

const toPrismaJson = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const getPayloadHash = (value: unknown): string => {
  const serialized = JSON.stringify(value) ?? '';
  return createHash('sha1').update(serialized).digest('hex');
};

const normalizeNcmDigits = (value: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
};

const extractNcmCodesFromUnknown = (value: unknown, bag: Set<string>) => {
  if (Array.isArray(value)) {
    for (const item of value) extractNcmCodesFromUnknown(item, bag);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const directNcm = getStringFromAliases(record, ['NCM', 'ncm', 'cNCM', 'codNCM', 'codigoNCM', 'codigo_ncm']);
  const normalized = normalizeNcmDigits(directNcm);
  if (normalized) bag.add(normalized);

  for (const child of Object.values(record)) {
    if (typeof child === 'object' && child !== null) {
      extractNcmCodesFromUnknown(child, bag);
    }
  }
};

const extractNcmClassMappingsFromUnknown = (value: unknown, bag: NcmClassMapRowInput[]) => {
  if (Array.isArray(value)) {
    for (const item of value) extractNcmClassMappingsFromUnknown(item, bag);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const ncm = normalizeNcmDigits(
    getStringFromAliases(record, ['NCM', 'ncm', 'cNCM', 'codNCM', 'codigoNCM', 'codigo_ncm']),
  );
  const classCode = getStringFromAliases(record, [
    'cClassTrib',
    'classTrib',
    'classificacao',
    'classTribCodigo',
    'codigoClassTrib',
  ]);
  const cstCode = getStringFromAliases(record, ['CST', 'cst', 'codCST', 'codigoCST']);
  const anexoCode = getStringFromAliases(record, ['Anexo', 'anexo', 'codAnexo', 'codigoAnexo']);
  const startDate = parseNullableDateSafe(
    getStringFromAliases(record, ['InicioVigencia', 'inicioVigencia', 'startDate', 'dthIniVig']),
  );
  const endDate = parseNullableDateSafe(
    getStringFromAliases(record, ['FimVigencia', 'fimVigencia', 'endDate', 'dthFimVig']),
  );

  if (ncm) {
    bag.push({ ncm, classCode, cstCode, anexoCode, startDate, endDate });
  }

  for (const child of Object.values(record)) {
    if (typeof child === 'object' && child !== null) {
      extractNcmClassMappingsFromUnknown(child, bag);
    }
  }
};

const getAnexoExternalKey = (item: Record<string, unknown>, index: number): string => {
  const direct =
    getStringFromAliases(item, ['id', 'codigo', 'codAnexo', 'cAnexo', 'anexo', 'chave', 'externalKey', 'external_key']) ??
    getStringFromAliases(item, ['code']);

  if (direct) return direct;

  const hash = createHash('sha1').update(JSON.stringify(item)).digest('hex').slice(0, 16);
  return `anexo_${index}_${hash}`;
};

const getCredPresumidoExternalKey = (item: Record<string, unknown>, index: number): string => {
  const direct =
    getStringFromAliases(item, [
      'codOperacao',
      'cod_operacao',
      'id',
      'codigo',
      'codCredito',
      'cCredito',
      'credito',
      'chave',
      'externalKey',
      'external_key',
    ]) ?? getStringFromAliases(item, ['code']);

  if (direct) return direct;

  const hash = createHash('sha1').update(JSON.stringify(item)).digest('hex').slice(0, 16);
  return `cred_presumido_${index}_${hash}`;
};

const getNcmExternalKey = (item: Record<string, unknown>, index: number): string => {
  const possibleKeys = [item.codigo, item.Codigo, item.ncm, item.NCM, item.code, item.Code, item.id, item.ID];

  for (const key of possibleKeys) {
    const value = asString(key);
    if (value) return value.replace(/\D/g, '');
  }

  const hash = createHash('sha1').update(JSON.stringify(item)).digest('hex').slice(0, 16);
  return `ncm_${index}_${hash}`;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Erro inesperado.';
}

function isSyncMode(value: unknown): value is TaxSyncMode {
  return value === 'classTrib' || value === 'anexos' || value === 'credPresumido' || value === 'ncm';
}

function getCounterValue(
  result: TaxActionResponse,
  key: 'inserted' | 'updated' | 'unchanged' | 'failed',
): number {
  const value = result[key];
  return typeof value === 'number' ? value : 0;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))];
}

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async getClassificationListViewData() {
    const previewLimit = 300;

    const [totalCount, rows] = await Promise.all([
      this.prisma.taxClassification.count(),
      this.prisma.taxClassification.findMany({
        orderBy: { code: 'asc' },
        take: previewLimit,
        select: {
          id: true,
          code: true,
          description: true,
          pRedIBS: true,
          pRedCBS: true,
          cst: { select: { cst: true } },
        },
      }),
    ]);

    return {
      totalCount,
      items: rows.map((item) => ({
        ...item,
        pRedIBS: item.pRedIBS ?? 0,
        pRedCBS: item.pRedCBS ?? 0,
      })),
      previewLimit,
    };
  }

  async getRulesViewData() {
    const rows = await this.prisma.taxCST.findMany({
      orderBy: { cst: 'asc' },
      select: {
        id: true,
        cst: true,
        description: true,
        indIBSCBS: true,
        classifications: {
          orderBy: { code: 'asc' },
          select: {
            id: true,
            code: true,
            description: true,
            pRedIBS: true,
            pRedCBS: true,
            indNFe: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return rows.map((item) => ({
      ...item,
      classifications: item.classifications.map((classification) => ({
        ...classification,
        pRedIBS: classification.pRedIBS ?? 0,
        pRedCBS: classification.pRedCBS ?? 0,
      })),
    }));
  }

  async getAnexosViewData() {
    return this.prisma.taxAnexo.findMany({
      orderBy: [{ code: 'asc' }, { title: 'asc' }],
      take: 300,
      select: {
        id: true,
        externalKey: true,
        code: true,
        title: true,
        description: true,
        category: true,
        publishDate: true,
        startDate: true,
        endDate: true,
        lastUpdated: true,
      },
    });
  }

  async getCredPresumidoViewData() {
    return this.prisma.taxCredPresumido.findMany({
      orderBy: [{ code: 'asc' }, { title: 'asc' }],
      take: 300,
      select: {
        id: true,
        externalKey: true,
        code: true,
        title: true,
        description: true,
        category: true,
        publishDate: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  async getNcmViewData() {
    const rows = await this.prisma.taxNcm.findMany({
      orderBy: [{ code: 'asc' }],
      take: 400,
      select: {
        id: true,
        code: true,
        description: true,
        startDate: true,
        endDate: true,
        replacedByCode: true,
        actType: true,
        actNumber: true,
        actYear: true,
        lastUpdated: true,
      },
    });

    return rows.map((item) => ({
      ...item,
      description: item.description ?? '',
      actYear: item.actYear != null ? String(item.actYear) : null,
    }));
  }

  async lookupNcm(input: string | null) {
    const ncm = normalizeNcmDigits(input);
    if (!ncm) {
      return { error: 'Informe um NCM valido com 8 digitos.' };
    }

    const [anexoRefs, mappingRows] = await Promise.all([
      this.prisma.taxAnexoNcm.findMany({
        where: { ncm },
        select: {
          anexo: {
            select: {
              id: true,
              code: true,
              externalKey: true,
              title: true,
              category: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        take: 300,
      }),
      this.prisma.taxNcmClassMap.findMany({
        where: { ncm },
        orderBy: [{ classCode: 'asc' }, { cstCode: 'asc' }],
        take: 1000,
        select: {
          classCode: true,
          cstCode: true,
          anexoCode: true,
          startDate: true,
          endDate: true,
        },
      }),
    ]);

    const anexoById = new Map<string, (typeof anexoRefs)[number]['anexo']>();
    for (const row of anexoRefs) {
      anexoById.set(row.anexo.id, row.anexo);
    }
    const matchedAnexos = Array.from(anexoById.values());

    const classTribCodes = unique(mappingRows.map((row) => row.classCode));
    const anexoCodes = unique([
      ...mappingRows.map((row) => row.anexoCode),
      ...matchedAnexos.map((row) => row.code ?? row.externalKey),
    ]);
    const cstCodesFromMap = unique(mappingRows.map((row) => row.cstCode));

    const whereClauses: Array<Record<string, unknown>> = [];
    if (classTribCodes.length) whereClauses.push({ code: { in: classTribCodes } });
    if (anexoCodes.length) whereClauses.push({ anexo: { in: anexoCodes } });

    const classifications =
      whereClauses.length > 0
        ? await this.prisma.taxClassification.findMany({
            where: { OR: whereClauses },
            include: { cst: true },
            orderBy: { code: 'asc' },
            take: 300,
          })
        : [];

    const cstCodes = unique([...cstCodesFromMap, ...classifications.map((item) => item.cst?.cst ?? null)]);

    const csts =
      cstCodes.length > 0
        ? await this.prisma.taxCST.findMany({
            where: { cst: { in: cstCodes } },
            orderBy: { cst: 'asc' },
            take: 200,
          })
        : [];

    return {
      ok: true,
      ncm,
      summary: {
        anexos: matchedAnexos.length,
        classTrib: classifications.length,
        cst: csts.length,
        mappingRows: mappingRows.length,
      },
      anexos: matchedAnexos.map((item) => ({
        id: item.id,
        code: item.code,
        externalKey: item.externalKey,
        title: item.title,
        category: item.category,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
      classifications: classifications.map((item) => ({
        code: item.code,
        description: item.description,
        anexo: item.anexo,
        cst: item.cst
          ? {
              code: item.cst.cst,
              description: item.cst.description,
            }
          : null,
        pRedIBS: item.pRedIBS,
        pRedCBS: item.pRedCBS,
        tipoAliquota: item.tipoAliquota,
        link: item.link,
      })),
      csts: csts.map((item) => ({
        code: item.cst,
        description: item.description,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    };
  }

  async listSyncJobs(mode?: string | null) {
    return this.prisma.taxSyncJob.findMany({
      where: mode ? { mode } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        mode: true,
        source: true,
        status: true,
        snapshotVersion: true,
        fetchedAt: true,
        payloadHash: true,
        totalChunks: true,
        currentChunk: true,
        totalItems: true,
        processedItems: true,
        insertedCount: true,
        updatedCount: true,
        unchangedCount: true,
        failedCount: true,
        errorMessage: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async clearSyncJobs(mode?: string | null) {
    const result = await this.prisma.taxSyncJob.deleteMany({
      where: mode ? { mode } : undefined,
    });

    return {
      deletedCount: result.count,
    };
  }

  async processSyncChunk(body: TaxSyncChunkRequest) {
    if (!isSyncMode(body.mode)) {
      return { statusCode: 400, body: { success: false, error: 'Modo de sincronizacao invalido.' } };
    }

    if (!Array.isArray(body.chunk) || body.chunk.length === 0) {
      return { statusCode: 400, body: { success: false, error: 'Chunk vazio.' } };
    }

    const chunkIndex = typeof body.chunkIndex === 'number' ? body.chunkIndex : 0;
    const totalChunks = typeof body.totalChunks === 'number' ? body.totalChunks : 1;
    const isLastChunk = chunkIndex === totalChunks - 1;
    const totalItems = typeof body.totalItems === 'number' ? body.totalItems : body.chunk.length;

    let jobId = body.jobId;
    if (!jobId) {
      const snapshotVersion = `${body.mode}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const created = await this.prisma.taxSyncJob.create({
        data: {
          mode: body.mode,
          source: body.source ?? null,
          status: 'RUNNING',
          snapshotVersion,
          fetchedAt: typeof body.fetchedAt === 'number' ? new Date(body.fetchedAt) : new Date(),
          totalChunks,
          totalItems,
          startedAt: new Date(),
        },
        select: { id: true },
      });
      jobId = created.id;
    }

    const result =
      body.mode === 'classTrib'
        ? await this.saveTaxDataBatch(body.chunk)
        : body.mode === 'anexos'
          ? await this.saveTaxAnexosBatch(body.chunk)
          : body.mode === 'credPresumido'
            ? await this.saveTaxCredPresumidoBatch(body.chunk)
            : await this.saveTaxNcmBatch(body.chunk);

    if (!result.success) {
      if (jobId) {
        await this.prisma.taxSyncJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: result.error ?? 'Falha na sincronizacao.',
            finishedAt: new Date(),
            failedCount: { increment: body.chunk.length },
          },
        });
      }

      return { statusCode: 500, body: result };
    }

    const insertedCount = getCounterValue(result, 'inserted');
    const updatedCount = getCounterValue(result, 'updated');
    const unchangedCount = getCounterValue(result, 'unchanged');
    const failedCount = getCounterValue(result, 'failed');

    const chunkHash = createHash('sha1').update(JSON.stringify(body.chunk)).digest('hex');
    const previous = await this.prisma.taxSyncJob.findUnique({
      where: { id: jobId },
      select: { payloadHash: true },
    });
    const mergedHash = createHash('sha1')
      .update(`${previous?.payloadHash ?? ''}|${chunkHash}`)
      .digest('hex');

    await this.prisma.taxSyncJob.update({
      where: { id: jobId },
      data: {
        currentChunk: chunkIndex + 1,
        processedItems: { increment: body.chunk.length },
        insertedCount: { increment: insertedCount },
        updatedCount: { increment: updatedCount },
        unchangedCount: { increment: unchangedCount },
        failedCount: { increment: failedCount },
        payloadHash: mergedHash,
        ...(isLastChunk
          ? {
              status: 'SUCCESS',
              finishedAt: new Date(),
            }
          : {}),
      },
    });

    return {
      statusCode: 200,
      body: {
        ...result,
        jobId,
      },
    };
  }

  private async saveTaxDataBatch(data: unknown[]): Promise<TaxActionResponse> {
    const cstList = data as TaxCstDTO[];

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          let countCST = 0;
          let countClass = 0;

          for (const item of cstList) {
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
                lastUpdated: new Date(),
              },
              create: {
                cst: item.CST,
                description: item.DescricaoCST,
                indIBSCBS: item.IndIBSCBS,
                indRedBC: item.IndRedBC,
                indRedAliq: item.IndRedAliq,
                indTransfCred: item.IndTransfCred,
                indDif: item.IndDif,
                indAjusteCompet: item.IndAjusteCompet,
                indIBSCBSMono: item.IndIBSCBSMono,
                indCredPresIBSZFM: item.IndCredPresIBSZFM,
                publishDate: parseDate(item.Publicacao),
                startDate: parseDate(item.InicioVigencia),
                endDate: parseNullableDate(item.FimVigencia),
              },
            });
            countCST++;

            if (item.classificacoesTributarias?.length) {
              for (const subItem of item.classificacoesTributarias) {
                const anexo = parseNullableString(subItem.Anexo);
                await tx.taxClassification.upsert({
                  where: { code: subItem.cClassTrib },
                  update: {
                    description: subItem.DescricaoClassTrib,
                    cstId: cstRecord.id,
                    pRedIBS: parseDecimal(subItem.pRedIBS),
                    pRedCBS: parseDecimal(subItem.pRedCBS),
                    tipoAliquota: subItem.TipoAliquota,
                    link: subItem.Link,
                    indTribRegular: subItem.IndTribRegular,
                    indCredPresOper: subItem.IndCredPresOper,
                    indEstornoCred: subItem.IndEstornoCred,
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
                    anexo,
                    endDate: parseNullableDate(subItem.FimVigencia),
                  },
                  create: {
                    code: subItem.cClassTrib,
                    description: subItem.DescricaoClassTrib,
                    cstId: cstRecord.id,
                    pRedIBS: parseDecimal(subItem.pRedIBS),
                    pRedCBS: parseDecimal(subItem.pRedCBS),
                    tipoAliquota: subItem.TipoAliquota,
                    link: subItem.Link,
                    indTribRegular: subItem.IndTribRegular,
                    indCredPresOper: subItem.IndCredPresOper,
                    indEstornoCred: subItem.IndEstornoCred,
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
                    anexo,
                    publishDate: parseDate(subItem.Publicacao),
                    startDate: parseDate(subItem.InicioVigencia),
                    endDate: parseNullableDate(subItem.FimVigencia),
                  },
                });
                countClass++;
              }
            }
          }

          return { cst: countCST, class: countClass };
        },
        { maxWait: 20000, timeout: 60000 },
      );

      return {
        success: true,
        message: `Sucesso! ${result.cst} CSTs e ${result.class} Classificacoes processadas.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Erro ao salvar no banco: ${getErrorMessage(error)}`,
      };
    }
  }

  private async saveTaxAnexosBatch(data: unknown[]): Promise<TaxActionResponse> {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: true, message: 'Nenhum anexo para processar.' };
    }

    try {
      await this.prisma.taxAnexo.deleteMany({
        where: {
          externalKey: {
            startsWith: 'anexo_',
          },
        },
      });

      const normalized = data.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => item !== null);

      let count = 0;
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;
      const chunkRefRows: Array<{ anexoId: string; ncm: string }> = [];
      const chunkClassMapRows: Array<NcmClassMapRowInput & { sourceAnexoId: string }> = [];
      const chunkAnexoIds = new Set<string>();

      for (let index = 0; index < normalized.length; index++) {
        const item = normalized[index];
        const externalKey = getAnexoExternalKey(item, index);
        const code =
          getStringFromAliases(item, ['codigo', 'codAnexo', 'cAnexo', 'anexo', 'code', 'codigo_anexo', 'cod_anexo']) ??
          externalKey;
        const title =
          getStringFromAliases(item, ['titulo', 'nome', 'descricaoCurta', 'anexo', 'title', 'name']) ??
          getAnyMeaningfulString(item);
        const description =
          getStringFromAliases(item, ['descricao', 'texto', 'detalhe', 'description', 'textoLegal']) ??
          getAnyMeaningfulString(item);
        const category = getStringFromAliases(item, ['categoria', 'tipo', 'grupo', 'category']);
        const publishDate = parseNullableDateSafe(
          getStringFromAliases(item, ['publicacao', 'dataPublicacao', 'publishDate', 'dthPublicacao']),
        );
        const startDate = parseNullableDateSafe(
          getStringFromAliases(item, ['inicioVigencia', 'dataInicioVigencia', 'startDate', 'dthIniVig']),
        );
        const endDate = parseNullableDateSafe(
          getStringFromAliases(item, ['fimVigencia', 'dataFimVigencia', 'endDate', 'dthFimVig']),
        );

        const payloadHash = getPayloadHash(item);
        const existing = await this.prisma.taxAnexo.findUnique({
          where: { externalKey },
          select: { id: true, payloadHash: true },
        });

        if (existing && existing.payloadHash === payloadHash) {
          unchanged++;
          chunkAnexoIds.add(existing.id);
          const ncmSetUnchanged = new Set<string>();
          extractNcmCodesFromUnknown(item, ncmSetUnchanged);
          for (const ncm of ncmSetUnchanged) {
            chunkRefRows.push({ anexoId: existing.id, ncm });
          }
          const mappedRowsUnchanged: NcmClassMapRowInput[] = [];
          extractNcmClassMappingsFromUnknown(item, mappedRowsUnchanged);
          for (const row of mappedRowsUnchanged) {
            chunkClassMapRows.push({
              ...row,
              sourceAnexoId: existing.id,
              anexoCode: row.anexoCode ?? code ?? externalKey,
            });
          }
          count++;
          continue;
        }

        const upserted = await this.prisma.taxAnexo.upsert({
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
            payloadHash,
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
            payloadHash,
          },
          select: { id: true },
        });

        if (existing) updated++;
        else inserted++;

        chunkAnexoIds.add(upserted.id);
        const ncmSet = new Set<string>();
        extractNcmCodesFromUnknown(item, ncmSet);
        for (const ncm of ncmSet) {
          chunkRefRows.push({ anexoId: upserted.id, ncm });
        }

        const mappedRows: NcmClassMapRowInput[] = [];
        extractNcmClassMappingsFromUnknown(item, mappedRows);
        for (const row of mappedRows) {
          chunkClassMapRows.push({
            ...row,
            sourceAnexoId: upserted.id,
            anexoCode: row.anexoCode ?? code ?? externalKey,
          });
        }

        count++;
      }

      if (chunkAnexoIds.size > 0) {
        await this.prisma.taxAnexoNcm.deleteMany({
          where: { anexoId: { in: Array.from(chunkAnexoIds) } },
        });

        if (chunkRefRows.length > 0) {
          await this.prisma.taxAnexoNcm.createMany({
            data: chunkRefRows,
            skipDuplicates: true,
          });
        }

        await this.prisma.taxNcmClassMap.deleteMany({
          where: { sourceAnexoId: { in: Array.from(chunkAnexoIds) } },
        });

        if (chunkClassMapRows.length > 0) {
          await this.prisma.taxNcmClassMap.createMany({
            data: chunkClassMapRows,
            skipDuplicates: true,
          });
        }
      }

      return {
        success: true,
        message: `Sucesso! ${count} anexos processados.`,
        inserted,
        updated,
        unchanged,
        failed: 0,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Erro ao salvar anexos no banco: ${getErrorMessage(error)}`,
      };
    }
  }

  private async saveTaxCredPresumidoBatch(data: unknown[]): Promise<TaxActionResponse> {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: true, message: 'Nenhum credito presumido para processar.' };
    }

    try {
      await this.prisma.taxCredPresumido.deleteMany({
        where: {
          externalKey: {
            startsWith: 'cred_presumido_',
          },
        },
      });

      const normalized = data.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => item !== null);

      let count = 0;
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;

      for (let index = 0; index < normalized.length; index++) {
        const item = normalized[index];
        const externalKey = getCredPresumidoExternalKey(item, index);
        const code =
          getStringFromAliases(item, ['codOperacao', 'cod_operacao', 'codigo', 'codCredito', 'cCredito', 'code']) ??
          externalKey;
        const title =
          getStringFromAliases(item, ['nomeOperacao', 'nome_operacao', 'titulo', 'nome', 'credito', 'title', 'name']) ??
          getAnyMeaningfulString(item);
        const legalText = getStringFromAliases(item, ['texDispLegal', 'textoDispLegal', 'dispositivoLegal', 'baseLegal']);
        const operationLocation = getStringFromAliases(item, ['texLocalOperacao', 'localOperacao']);
        const supplierLocation = getStringFromAliases(item, ['texLocalFornec', 'localFornecedor']);
        const supplierProfile = getStringFromAliases(item, ['texCaractFornec', 'caracteristicaFornecedor']);
        const fallbackDescriptionParts = [
          legalText ? `Base legal: ${legalText}` : null,
          operationLocation ? `Local da operacao: ${operationLocation}` : null,
          supplierLocation ? `Local do fornecedor: ${supplierLocation}` : null,
          supplierProfile ? `Perfil do fornecimento: ${supplierProfile}` : null,
        ].filter((part): part is string => Boolean(part));

        const description =
          getStringFromAliases(item, ['descricao', 'texto', 'detalhe', 'description']) ??
          (fallbackDescriptionParts.length ? fallbackDescriptionParts.join(' | ') : null);
        const category =
          legalText ?? getStringFromAliases(item, ['categoria', 'tipo', 'grupo', 'category']) ?? null;
        const publishDate = parseNullableDateSafe(
          getStringFromAliases(item, ['dthPublicacao', 'publicacao', 'dataPublicacao', 'publishDate']),
        );
        const startDate = parseNullableDateSafe(
          getStringFromAliases(item, ['dthIniVig', 'inicioVigencia', 'dataInicioVigencia', 'startDate']),
        );
        const endDate = parseNullableDateSafe(
          getStringFromAliases(item, ['dthFimVig', 'fimVigencia', 'dataFimVigencia', 'endDate']),
        );

        const payloadHash = getPayloadHash(item);
        const existing = await this.prisma.taxCredPresumido.findUnique({
          where: { externalKey },
          select: { id: true, payloadHash: true },
        });

        if (existing && existing.payloadHash === payloadHash) {
          unchanged++;
          count++;
          continue;
        }

        await this.prisma.taxCredPresumido.upsert({
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
            payloadHash,
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
            payloadHash,
          },
        });

        if (existing) updated++;
        else inserted++;
        count++;
      }

      return {
        success: true,
        message: `Sucesso! ${count} registros de credito presumido processados.`,
        inserted,
        updated,
        unchanged,
        failed: 0,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Erro ao salvar credito presumido no banco: ${getErrorMessage(error)}`,
      };
    }
  }

  private async saveTaxNcmBatch(data: unknown[]): Promise<TaxActionResponse> {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: true, message: 'Nenhum NCM para processar.' };
    }

    try {
      const normalized = data.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => item !== null);

      let count = 0;
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;

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
        const code = codeRaw.replace(/\D/g, '').slice(0, 8);
        if (!code) continue;

        const description =
          asString(item.descricao) ??
          asString(item.Descricao) ??
          asString(item.descricao_resumida) ??
          asString(item.description) ??
          'Sem descricao';
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
        const actType = asString(item.tipo_ato) ?? asString(item.tipoAto) ?? asString(item.tipo_legal);
        const actNumber = asString(item.numero_ato) ?? asString(item.numeroAto) ?? asString(item.num_ato);
        const actYear = asString(item.ano_ato) ?? asString(item.anoAto);
        const replacedByCode =
          (
            asString(item.substituido_por) ??
            asString(item.substituidoPor) ??
            asString(item.replaced_by) ??
            asString(item.replacedBy) ??
            asString(item.ncmSubstituto) ??
            ''
          )
            .replace(/\D/g, '')
            .slice(0, 8) || null;

        const payloadHash = getPayloadHash(item);
        const existing = await this.prisma.taxNcm.findUnique({
          where: { code },
          select: { id: true, payloadHash: true },
        });

        if (existing && existing.payloadHash === payloadHash) {
          unchanged++;
          count++;
          continue;
        }

        await this.prisma.taxNcm.upsert({
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
            payloadHash,
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
            payloadHash,
          },
        });

        if (existing) updated++;
        else inserted++;
        count++;
      }

      return {
        success: true,
        message: `Sucesso! ${count} NCM(s) processado(s).`,
        inserted,
        updated,
        unchanged,
        failed: 0,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Erro ao salvar NCM no banco: ${getErrorMessage(error)}`,
      };
    }
  }
}
