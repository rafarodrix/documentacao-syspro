import { createMDX } from 'fumadocs-mdx/next';
import { z } from 'zod';

const lastUpdatedSchema = z.preprocess(
  (value) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value;
  },
  z.string(),
).optional();

const withMDX = createMDX({
  frontmatterSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    causa_do_erro: z.string().optional(),
    lastUpdated: lastUpdatedSchema,
    owner: z.string().optional(),
    status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs/suporte/processos/integra%C3%A7%C3%A3o%20zammad',
        destination: '/docs/suporte/processos/integracao-zammad',
        permanent: true,
      },
      {
        source: '/docs/suporte/processos/integracao zammad',
        destination: '/docs/suporte/processos/integracao-zammad',
        permanent: true,
      },
    ];
  },
};

export default withMDX(nextConfig);
