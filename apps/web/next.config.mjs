import path from 'node:path';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../../'),
  eslint: {
    // Lint permanece disponivel via `npm run lint`; evitamos duplicar esse custo no build de deploy.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typecheck permanece disponivel via `npm run typecheck`; evita OOM no `next build` de deploy.
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: '/docs/suporte', destination: '/portal/docs/suporte', permanent: false },
      { source: '/docs/manuais-tecnicos', destination: '/portal/docs/suporte', permanent: false },
      { source: '/docs/treinamento/steps-comercial', destination: '/portal/docs/cliente/primeiros-passos/steps-comercial', permanent: false },
      { source: '/docs/treinamento/steps-auto-center', destination: '/portal/docs/cliente/primeiros-passos/steps-auto-center', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
};

export default withMDX(nextConfig);
