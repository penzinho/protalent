import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#07213E',   // The dark blue from your logo
          orange: '#E76518', // The orange from your logo
          yellow: '#F49E17', // The yellow from your logo
        }
      }
    },
  },
  plugins: [],
};
export default config;