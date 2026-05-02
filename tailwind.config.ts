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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Oracle's Chamber palette
        ember: {
          50: "#fef7f0",
          100: "#fceee0",
          200: "#f8d9bc",
          300: "#f3be8d",
          400: "#e9985c",
          500: "#e07c38", // Primary accent
          600: "#d16426",
          700: "#ae4e21",
          800: "#8b4022",
          900: "#71371f",
        },
        gold: {
          50: "#fbf9f5",
          100: "#f5f0e6",
          200: "#eadec8",
          300: "#dcc7a3",
          400: "#c4956a", // Secondary accent
          500: "#b48352",
          600: "#a06c43",
          700: "#855538",
          800: "#6d4633",
          900: "#5a3b2c",
        },
        sage: {
          50: "#f4f7f6",
          100: "#e1ebe7",
          200: "#c4d6d0",
          300: "#9eb9b0",
          400: "#6b9a8d", // Listening state
          500: "#4e7d70",
          600: "#3d645a",
          700: "#33514a",
          800: "#2c433d",
          900: "#273935",
        },
        terra: {
          50: "#fdf5f3",
          100: "#fce8e4",
          200: "#fad5cd",
          300: "#f5b7a9",
          400: "#ec8d78",
          500: "#d4654a", // Speaking state
          600: "#c14f34",
          700: "#a24029",
          800: "#863826",
          900: "#703325",
        },
        chamber: {
          50: "#f8f7f6",
          100: "#e8e4de", // Warm white text
          200: "#d4cec4",
          300: "#b8afa2",
          400: "#9a9590", // Stone text
          500: "#7a756f",
          600: "#635f5a",
          700: "#514e4a",
          800: "#45423f",
          900: "#08080c", // Deep black bg
          950: "#050507",
        },
        // Sage v2 accents — playful pops for mobile-first surfaces
        zest: {
          50: "#fbffe5",
          100: "#f5fdc1",
          200: "#ecfb89",
          300: "#dff45a",
          400: "#cfe83a", // Primary zest
          500: "#b3cf25",
          600: "#8aa31a",
          700: "#697b18",
          800: "#54611a",
          900: "#46521c",
        },
        bloom: {
          400: "#f5b8d6", // Soft pink
          500: "#e98ab9",
          600: "#c768a0",
        },
        plum: {
          400: "#b48af2",
          500: "#9a6ce8",
          600: "#7e51c8",
        },
        peach: {
          400: "#f7b08a",
          500: "#ee8c5e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        body: ["var(--font-body)", "DM Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "breathe": "breathe 4s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.8s ease-out forwards",
        "scale-in": "scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.9" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-oracle": "linear-gradient(135deg, var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
