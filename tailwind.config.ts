import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0f141d", surface: "#161d29", raised: "#1d2634", inset: "#111822",
        line: "#2b3748", control: "#52637a", ink: "#e6edf5", muted: "#b0bdd0", subtle: "#95a5bb",
        accent: "#8eacff", "accent-soft": "#243455", primary: "#4263d4", "primary-hover": "#3453bf",
        danger: "#f2a8b2", "danger-soft": "#30222c",
      },
      fontFamily: {
        sans: ['"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
