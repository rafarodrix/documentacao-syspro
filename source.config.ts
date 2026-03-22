import { defineDocs, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema.extend({
      lastUpdated: z.string().optional(),
      owner: z.string().optional(),
      status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
      tags: z.array(z.string()).optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});

