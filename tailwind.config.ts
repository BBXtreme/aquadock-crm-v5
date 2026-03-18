/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Sans", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      colors: {
        primary: {
          DEFAULT: "#24BACC",
          dark: "#1E9CA6",
          light: "#3CD8E5",
        },
        secondary: {
          DEFAULT: "#BA47C0",
          dark: "#9B3AA0",
        },
        marine: {
          50: "#E6F7FA",
          100: "#CCEFF5",
          500: "#24BACC",
          700: "#1A8A94",
          900: "#0F5A62",
        },
        accent: "#BA47C0",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}