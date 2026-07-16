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
