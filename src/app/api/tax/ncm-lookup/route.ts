import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";

type JsonRecord = Record<string, unknown>;

function normalizeNcm(input: string | null) {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function readString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  }
  return null;
}

function findNcmMatches(value: unknown, ncm: string, bag: JsonRecord[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => findNcmMatches(item, ncm, bag));
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const ncmValue = readString(record, ["NCM", "ncm", "cNCM", "codNCM", "codigoNCM", "codigo_ncm"]);
  if (ncmValue) {
    const normalized = ncmValue.replace(/\D/g, "");
    if (normalized === ncm) bag.push(record);
  }

  Object.values(record).forEach((child) => {
    if (typeof child === "object" && child !== null) {
      findNcmMatches(child, ncm, bag);
    }
  });
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))];
}

export async function GET(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ncm = normalizeNcm(searchParams.get("ncm"));
  if (!ncm) {
    return NextResponse.json({ error: "Informe um NCM valido com 8 digitos." }, { status: 400 });
  }

  const anexos = await prisma.taxAnexo.findMany({
    select: {
      id: true,
      code: true,
      externalKey: true,
      title: true,
      category: true,
      raw: true,
      startDate: true,
      endDate: true,
    },
  });

  const extracted: JsonRecord[] = [];
  const matchedAnexos = anexos.filter((anexo) => {
    const localMatches: JsonRecord[] = [];
    findNcmMatches(anexo.raw, ncm, localMatches);
    if (localMatches.length > 0) {
      extracted.push(...localMatches);
      return true;
    }
    return false;
  });

  const anexoCodes = unique(
    matchedAnexos.flatMap((anexo) => [anexo.code, anexo.externalKey, readString(anexo as unknown as JsonRecord, ["Anexo", "anexo"])]),
  );

  const classTribCodes = unique(
    extracted.flatMap((item) => [
      readString(item, ["cClassTrib", "classTrib", "classificacao", "classTribCodigo", "codigoClassTrib"]),
    ]),
  );

  const cstCodes = unique(
    extracted.flatMap((item) => [readString(item, ["CST", "cst", "codCST", "codigoCST"])]),
  );

  const whereClauses: any[] = [];
  if (classTribCodes.length) whereClauses.push({ code: { in: classTribCodes } });
  if (anexoCodes.length) whereClauses.push({ anexo: { in: anexoCodes } });

  const classifications =
    whereClauses.length > 0
      ? await prisma.taxClassification.findMany({
          where: { OR: whereClauses },
          include: { cst: true },
          orderBy: { code: "asc" },
          take: 100,
        })
      : [];

  const foundCstCodes = unique([...cstCodes, ...classifications.map((item) => item.cst?.cst ?? null)]);

  const csts =
    foundCstCodes.length > 0
      ? await prisma.taxCST.findMany({
          where: { cst: { in: foundCstCodes } },
          orderBy: { cst: "asc" },
        })
      : [];

  return NextResponse.json({
    ok: true,
    ncm,
    summary: {
      anexos: matchedAnexos.length,
      classTrib: classifications.length,
      cst: csts.length,
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
  });
}

