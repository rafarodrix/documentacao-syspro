import type { Config } from "tailwindcss";
import { createPreset } from "fumadocs-ui/tailwind-plugin";

const config = {
  content: [
    // Lê todos os arquivos em sua nova pasta src/
    "./src/**/*.{ts,tsx}", 
    "./content/**/*.{md,mdx}",
    "./node_modules/fumadocs-ui/dist/**/*.js",
  ],
  presets: [createPreset()],
} satisfies Config;

export default config;