import { z } from "zod";

export const SqlScriptFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  author: z.string(),
  createdAt: z.string(),
  firebirdVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type SqlScript = z.infer<typeof SqlScriptFrontmatterSchema> & {
  sql: string;
};
