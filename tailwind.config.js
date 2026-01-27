/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    // Add any other paths if you have more folders with Tailwind classes
    // "./src/**/*.{js,ts,jsx,tsx}"    ← sometimes people use this broader version
  ],
  theme: {
    extend: {
      // Custom animation for smooth progress bar fill
      animation: {
        'progress-smooth': 'progress-smooth 0.8s ease-out forwards',
      },
      keyframes: {
        'progress-smooth': {
          '0%':   { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
      },

      // You can add more custom theme extensions here in the future if needed, e.g.:
      // colors: { ... },
      // spacing: { ... },
      // fontFamily: { ... },
    },
  },
  plugins: [],
}