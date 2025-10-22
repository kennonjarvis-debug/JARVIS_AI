import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          primary: "#0066FF",
          secondary: "#00D4FF",
          success: "#00FF88",
          warning: "#FFAA00",
          danger: "#FF3366",
          dark: "#0A0E27",
          darker: "#05070F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
