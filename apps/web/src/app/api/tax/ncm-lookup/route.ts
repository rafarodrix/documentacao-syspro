import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";

function normalizeNcm(input: string | null) {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
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

  const [anexoRefs, mappingRows] = await Promise.all([
    prisma.taxAnexoNcm.findMany({
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
    prisma.taxNcmClassMap.findMany({
      where: { ncm },
      orderBy: [{ classCode: "asc" }, { cstCode: "asc" }],
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

  const anexoById = new Map<string, (typeof anexoRefs)[number]["anexo"]>();
  for (const row of anexoRefs) {
    anexoById.set(row.anexo.id, row.anexo);
  }
  const matchedAnexos = Array.from(anexoById.values());

  const classTribCodes = unique(mappingRows.map((row) => row.classCode));
  const anexoCodes = unique([...mappingRows.map((row) => row.anexoCode), ...matchedAnexos.map((row) => row.code ?? row.externalKey)]);
  const cstCodesFromMap = unique(mappingRows.map((row) => row.cstCode));

  const whereClauses: Array<Record<string, unknown>> = [];
  if (classTribCodes.length) whereClauses.push({ code: { in: classTribCodes } });
  if (anexoCodes.length) whereClauses.push({ anexo: { in: anexoCodes } });

  const classifications =
    whereClauses.length > 0
      ? await prisma.taxClassification.findMany({
          where: { OR: whereClauses },
          include: { cst: true },
          orderBy: { code: "asc" },
          take: 300,
        })
      : [];

  const cstCodes = unique([
    ...cstCodesFromMap,
    ...classifications.map((item) => item.cst?.cst ?? null),
  ]);

  const csts =
    cstCodes.length > 0
      ? await prisma.taxCST.findMany({
          where: { cst: { in: cstCodes } },
          orderBy: { cst: "asc" },
          take: 200,
        })
      : [];

  return NextResponse.json({
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
  });
}

