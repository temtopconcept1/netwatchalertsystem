/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a0f1e",
          900: "#0f1730",
          800: "#152040",
          700: "#1c2b52",
        },
        brand: {
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        status: {
          online: "#22c55e",
          warning: "#eab308",
          offline: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
