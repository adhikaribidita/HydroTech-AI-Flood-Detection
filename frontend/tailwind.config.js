/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hydro: {
          900: "#020b18",
          800: "#071424",
          700: "#0f2040",
          600: "#163052",
          500: "#1f4b7a",
          400: "#2b76aa",
          300: "#54b7ff",
          200: "#8fdcff",
          100: "#dff6ff",
        },
      },
      boxShadow: {
        glow: "0 0 60px rgba(81, 196, 255, 0.18)",
        panel: "0 20px 80px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "hydro-radial": "radial-gradient(circle at top, rgba(32, 115, 238, 0.18), transparent 42%), radial-gradient(circle at 80% 10%, rgba(63, 212, 255, 0.12), transparent 18%)",
      },
    },
  },
  plugins: [],
}
