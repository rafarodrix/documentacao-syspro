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
        source: '/docs/manuais-tecnicos/arquitetura-aplicacao-monorepo',
        destination: '/docs/manuais-tecnicos/arquitetura/arquitetura-aplicacao-monorepo',
        permanent: true,
      },
      {
        source: '/docs/manuais-tecnicos/arquitetura-documentacao-fumadocs',
        destination: '/docs/manuais-tecnicos/arquitetura/arquitetura-documentacao-fumadocs',
        permanent: true,
      },
      {
        source: '/docs/manuais-tecnicos/arquitetura-referencia-por-fluxo',
        destination: '/docs/manuais-tecnicos/arquitetura/arquitetura-referencia-por-fluxo',
        permanent: true,
      },
      {
        source: '/docs/manuais-tecnicos/backlog-infra-monorepo',
        destination: '/docs/manuais-tecnicos/governanca/backlog-infra-monorepo',
        permanent: true,
      },
      {
        source: '/docs/manuais-tecnicos/padrao-componentes-mdx',
        destination: '/docs/manuais-tecnicos/padroes/padrao-componentes-mdx',
        permanent: true,
      },
      {
        source: '/docs/manuais-tecnicos/diff-highlighting-shiki',
        destination: '/docs/manuais-tecnicos/padroes/diff-highlighting-shiki',
        permanent: true,
      },
      {
        source: '/docs/manuais-tecnicos/estrategia-plataforma-remota',
        destination: '/docs/manuais-tecnicos/estrategia/estrategia-plataforma-remota',
        permanent: true,
      },
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
