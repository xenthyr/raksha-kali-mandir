
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff9f2",
          100: "#fff0de",
          200: "#fedcb6",
          300: "#fdbf83",
          400: "#fb9749",
          500: "#f97316",
          600: "#ea580c",
          700: "#c23f0a",
          800: "#9a320d",
          900: "#7c2b0e",
        },
        kumkum: {
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
        },
        sanctum: {
          800: "#2a221b",
          850: "#1e1915",
          900: "#16120f",
          950: "#0c0a08",
        },
      },
      fontFamily: {
        bengali: ["var(--font-noto-sans-bengali)", "sans-serif"],
        serif: ["var(--font-noto-serif-bengali)", "serif"],
        num: ["var(--font-jakarta)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
