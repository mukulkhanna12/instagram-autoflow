import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    // Class names built in lib/ (e.g. workspace colours) must be scanned too.
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep forest green — primary actions, the active nav item, the
        // highlighted stat card.
        brand: {
          50: "#eef6f1",
          100: "#d7ebdf",
          200: "#b0d6bf",
          300: "#80bb97",
          400: "#4f9a6d",
          500: "#2e7d4f",
          600: "#236840",
          700: "#1d5535",
          800: "#18452c",
          900: "#123522",
          950: "#0b2316",
        },
        // Lime accent — the "New automation" button, usage bars, highlights.
        lime: {
          DEFAULT: "#dcfb4b",
          50: "#fbffe6",
          100: "#f4fec3",
          200: "#ebfd8f",
          300: "#dcfb4b",
          400: "#cbeb2a",
          500: "#aecd12",
          600: "#879f0b",
        },
      },
      fontFamily: {
        sans: ["\"Plus Jakarta Sans\"", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
