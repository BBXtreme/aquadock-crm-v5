import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#24BACC",
          dark: "#1E9CA6",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "#BA47C0",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "#059669",
          light: "#34D399",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#F87171",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FBBF24",
        },
        info: {
          DEFAULT: "#0284C7",
          light: "#38BDF8",
        },
        lead: {
          DEFAULT: "#F59E0B",
          light: "#FCD34D",
        },
        won: {
          DEFAULT: "#059669",
          light: "#34D399",
        },
        lost: {
          DEFAULT: "#DC2626",
          light: "#F87171",
        },
        sonstige: {
          DEFAULT: "#6B7280",
          light: "#9CA3AF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        "heading-1": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em", fontWeight: "600" }],
        "heading-2": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.025em", fontWeight: "600" }],
        "heading-3": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.025em", fontWeight: "600" }],
        "body-large": ["1.125rem", { lineHeight: "1.75rem", fontWeight: "400" }],
        "body": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        "body-small": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
};

export default config;
