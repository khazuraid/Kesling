import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "oklch(0.32 0.08 5)", // Deep mahogany
          accent: "oklch(0.92 0.02 15)", // Warm grey/blush
          ink: "oklch(0.18 0.02 10)", // Warm charcoal
          surface: "oklch(0.98 0.01 15)", // Tinted surface
        },
      },
    },
  },
  plugins: [animate],
};
export default config;
