import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export function buildPaginationMeta(input: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  const { page, pageSize, total } = input;
  return {
    page,
    pageSize,
    total,
    hasNextPage: page * pageSize < total,
    hasPreviousPage: page > 1,
  };
}
