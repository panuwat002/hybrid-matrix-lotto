import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          bg: "#0a0a0f",
          green: "#00ff9c",
          cyan: "#00d4ff",
          dim: "#1a1a24",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        thai: ["var(--font-thai)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
