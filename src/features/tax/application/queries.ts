import { prisma } from "@/lib/prisma";
import type {
  TaxAnexoListItem,
  TaxClassificationListViewData,
  TaxCredPresumidoListItem,
  TaxNcmListItem,
  TaxRulesGroupItem,
} from "@/features/tax/domain/model";

export async function getTaxClassificationListViewData(): Promise<TaxClassificationListViewData> {
  const previewLimit = 300;

  const [totalCount, rows] = await Promise.all([
    prisma.taxClassification.count(),
    prisma.taxClassification.findMany({
      orderBy: { code: "asc" },
      take: previewLimit,
      select: {
        id: true,
        code: true,
        description: true,
        pRedIBS: true,
        pRedCBS: true,
        cst: {
          select: { cst: true },
        },
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

export async function getTaxRulesViewData(): Promise<TaxRulesGroupItem[]> {
  return prisma.taxCST.findMany({
    orderBy: { cst: "asc" },
    select: {
      id: true,
      cst: true,
      description: true,
      indIBSCBS: true,
      classifications: {
        orderBy: { code: "asc" },
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
}

export async function getTaxAnexosViewData(): Promise<TaxAnexoListItem[]> {
  return prisma.taxAnexo.findMany({
    orderBy: [{ code: "asc" }, { title: "asc" }],
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

export async function getTaxCredPresumidoViewData(): Promise<TaxCredPresumidoListItem[]> {
  return prisma.taxCredPresumido.findMany({
    orderBy: [{ code: "asc" }, { title: "asc" }],
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

export async function getTaxNcmViewData(): Promise<TaxNcmListItem[]> {
  const rows = await prisma.taxNcm.findMany({
    orderBy: [{ code: "asc" }],
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
    description: item.description ?? "",
    actYear: item.actYear != null ? String(item.actYear) : null,
  }));
}
