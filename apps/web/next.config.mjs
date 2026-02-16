import { createMDX } from 'fumadocs-mdx/next';
import { z } from 'zod';

const withMDX = createMDX({
  frontmatterSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    causa_do_erro: z.string(),
  }),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cadens/core", "@cadens/utils", "@cadens/ui"],
};

export default withMDX(nextConfig);
