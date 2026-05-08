import { z } from "zod";

export const adminViewScopeSchema = z.object({
  isGlobalView: z.boolean(),
});

export type AdminViewScope = z.output<typeof adminViewScopeSchema>;
