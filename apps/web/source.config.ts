import { defineDocs, defineConfig, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { z } from 'zod';

const lastUpdatedSchema = z.preprocess(
  (value) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value;
  },
  z.string().min(1),
);

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema.extend({
      title: z.string().min(1),
      description: z.string().min(1),
      lastUpdated: lastUpdatedSchema,
      owner: z.string().min(1),
      status: z.enum(['draft', 'review', 'published', 'archived']),
      featureStatus: z.enum(['new', 'deprecated', 'beta', 'experimental']).optional(),
      sinceVersion: z.string().optional(),
      tags: z.array(z.string().min(1)).min(1),
    }),
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});
