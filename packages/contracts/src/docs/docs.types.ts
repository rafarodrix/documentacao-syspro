import { z } from "zod";

export const docsAudienceSegmentSchema = z.enum(["admin", "suporte", "cliente"]);

export const docsPopularItemSchema = z.object({
  href: z.string(),
  title: z.string(),
  count: z.number().int().nonnegative(),
  lastViewed: z.number().int().nonnegative(),
});

export const docsLastReadSchema = z.object({
  href: z.string(),
  title: z.string(),
  visitedAt: z.number().int().nonnegative(),
});

export const docsViewsResponseSchema = z.object({
  ok: z.literal(true),
  audienceSegment: docsAudienceSegmentSchema,
  globalPopular: z.array(docsPopularItemSchema),
  audiencePopular: z.array(docsPopularItemSchema),
  lastRead: docsLastReadSchema.nullable(),
});

export const docsRegisterViewInputSchema = z.object({
  href: z.string().optional(),
  title: z.string().optional(),
  visitedAt: z.number().int().optional(),
});

export const docsRegisterViewResultSchema = z.union([
  z.object({
    ok: z.literal(true),
  }),
  z.object({
    ok: z.literal(false),
    error: z.literal("invalid_href"),
  }),
]);

export const docsSubmitFeedbackInputSchema = z.object({
  slug: z.string(),
  title: z.string(),
  helpful: z.boolean(),
  reason: z.string().nullable(),
  votedAt: z.string(),
});

export const docsSubmitFeedbackResultSchema = z.object({
  ok: z.literal(true),
});

export type DocsAudienceSegment = z.infer<typeof docsAudienceSegmentSchema>;
export type DocsPopularItem = z.infer<typeof docsPopularItemSchema>;
export type DocsLastRead = z.infer<typeof docsLastReadSchema>;
export type DocsViewsResponse = z.infer<typeof docsViewsResponseSchema>;
export type DocsRegisterViewInput = z.infer<typeof docsRegisterViewInputSchema>;
export type DocsRegisterViewResult = z.infer<typeof docsRegisterViewResultSchema>;
export type DocsSubmitFeedbackInput = z.infer<typeof docsSubmitFeedbackInputSchema>;
export type DocsSubmitFeedbackResult = z.infer<typeof docsSubmitFeedbackResultSchema>;
