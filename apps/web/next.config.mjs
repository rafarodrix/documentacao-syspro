import path from 'node:path';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), '../../'),
  eslint: {
    // Lint permanece disponivel via `npm run lint`; evitamos duplicar esse custo no build do Vercel.
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
  async rewrites() {
    const backendApiBase =
      process.env.APP_BACKEND_API_URL?.trim() ||
      process.env.APP_BACKEND_API?.trim() ||
      process.env.APP_API_URL?.trim();

    if (!backendApiBase) {
      return [];
    }

    const normalizedBackendApiBase = backendApiBase.replace(/\/+$/, '');

    return [
      {
        source: '/api/trpc',
        destination: `${normalizedBackendApiBase}/trpc`,
      },
      {
        source: '/api/trpc/:path*',
        destination: `${normalizedBackendApiBase}/trpc/:path*`,
      },
    ];
  },
};

export default withMDX(nextConfig);
