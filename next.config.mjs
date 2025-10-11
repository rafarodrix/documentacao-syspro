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
  basePath: '/ajuda',

  reactStrictMode: true,
};

export default withMDX(nextConfig);