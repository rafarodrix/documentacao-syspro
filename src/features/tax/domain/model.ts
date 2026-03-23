import type { Prisma } from "@prisma/client";

export type TaxActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export type TaxDecimalLike = Prisma.Decimal | number | string;

export type TaxClassificationListItem = {
  id: string;
  code: string;
  description: string;
  pRedIBS: TaxDecimalLike;
  pRedCBS: TaxDecimalLike;
  cst: {
    cst: string;
  } | null;
};

export type TaxClassificationListViewData = {
  totalCount: number;
  items: TaxClassificationListItem[];
  previewLimit: number;
};

export type TaxRulesClassificationItem = {
  id: string;
  code: string;
  description: string;
  pRedIBS: TaxDecimalLike;
  pRedCBS: TaxDecimalLike;
  indNFe: boolean;
  startDate: Date;
  endDate: Date | null;
};

export type TaxRulesGroupItem = {
  id: string;
  cst: string;
  description: string;
  indIBSCBS: boolean;
  classifications: TaxRulesClassificationItem[];
};

export type TaxAnexoListItem = {
  id: string;
  externalKey: string;
  code: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  publishDate: Date;
  startDate: Date;
  endDate: Date | null;
  lastUpdated: Date;
};

export type TaxCredPresumidoListItem = {
  id: string;
  externalKey: string;
  code: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  publishDate: Date;
  startDate: Date;
  endDate: Date | null;
};

export type TaxNcmListItem = {
  id: string;
  code: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  replacedByCode: string | null;
  actType: string | null;
  actNumber: string | null;
  actYear: number | null;
  lastUpdated: Date;
};
