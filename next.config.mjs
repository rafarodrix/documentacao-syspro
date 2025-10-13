import { createMDX } from 'fumadocs-mdx/next';
import { z } from 'zod';

const withMDX = createMDX({
  frontmatterSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    causa_do_erro: z.string(), // O campo precisa estar definido aqui
  }),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NODE_ENV === 'production' ? '/ajuda' : '', // Ajuste automático do basePath com base no ambiente de execução 
  trailingSlash: true,
  reactStrictMode: true,
};

export default withMDX(nextConfig);