/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        leaf: {
          DEFAULT: "#43a419",
          light: "rgba(67,164,25,0.12)",
          border: "rgba(67,164,25,0.30)",
        },
        // Admin dark surfaces
        admin: {
          bg: "#0f172a",       // slate-950
          surface: "#1e293b",  // slate-800
          "surface-light": "#273548",
          border: "#334155",   // slate-700
          "border-light": "#475569", // slate-600
        },
      },
      animation: {
        "progress-smooth": "progress-smooth 0.8s ease-out forwards",
        shimmer: "shimmer 1.5s infinite",
        "toast-in": "toast-in 200ms ease-out",
        "toast-out": "toast-out 150ms ease-in forwards",
        "fade-in": "fade-in 200ms ease-in-out",
        "slide-up": "slide-up 200ms ease-out",
      },
      keyframes: {
        "progress-smooth": {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "toast-in": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "toast-out": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "admin-sm": "0 1px 2px rgba(0,0,0,0.2)",
        "admin-md": "0 4px 6px rgba(0,0,0,0.25)",
        "admin-lg": "0 10px 15px rgba(0,0,0,0.3)",
        "admin-xl": "0 20px 25px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
