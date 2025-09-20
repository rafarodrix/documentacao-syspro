import { createMDX } from 'fumadocs-mdx/next';
import { z } from 'zod'; // 1. Importe o Zod aqui

const withMDX = createMDX({
  // 2. Adicione a opção do schema aqui
  frontmatterSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    causa_do_erro: z.string(),
  }),
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default withMDX(config);