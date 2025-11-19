const { createPreset } = require("fumadocs-ui/tw");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./content/**/*.{md,mdx}",
    "./node_modules/fumadocs-ui/dist/**/*.{js,mjs}"
  ],
  presets: [createPreset()],
};