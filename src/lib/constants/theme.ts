/** Appearance: color schemes (primary + sidebar + ring + accent) — oklch, light/dark pairs */

export const APPEARANCE_COLOR_SCHEME_IDS = [
  "teal",
  "slate",
  "zinc",
  "blue",
  "emerald",
  "rose",
  "amber",
] as const;

export type AppearanceColorSchemeId = (typeof APPEARANCE_COLOR_SCHEME_IDS)[number];

export type AppearanceColorTokens = {
  "--primary": string;
  "--primary-foreground": string;
  "--sidebar-primary": string;
  "--sidebar-primary-foreground": string;
  "--ring": string;
  "--accent": string;
  "--accent-foreground": string;
};

/** Matches pre-appearance `globals.css` :root / .dark tokens (hue ~200 cyan/teal). */
const teal: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.68 0.15 200)",
    "--primary-foreground": "oklch(1 0 0)",
    "--sidebar-primary": "oklch(0.68 0.15 200)",
    "--sidebar-primary-foreground": "oklch(1 0 0)",
    "--ring": "oklch(0.708 0 0)",
    "--accent": "oklch(0.85 0.12 280)",
    "--accent-foreground": "oklch(0.145 0 0)",
  },
  dark: {
    "--primary": "oklch(0.68 0.15 200)",
    "--primary-foreground": "oklch(1 0 0)",
    "--sidebar-primary": "oklch(0.68 0.15 200)",
    "--sidebar-primary-foreground": "oklch(1 0 0)",
    "--ring": "oklch(0.556 0 0)",
    "--accent": "oklch(0.85 0.12 280)",
    "--accent-foreground": "oklch(0.985 0 0)",
  },
};

const slate: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.35 0.02 260)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.35 0.02 260)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.45 0.02 260)",
    "--accent": "oklch(0.94 0.01 260)",
    "--accent-foreground": "oklch(0.205 0.02 260)",
  },
  dark: {
    "--primary": "oklch(0.75 0.02 260)",
    "--primary-foreground": "oklch(0.145 0 0)",
    "--sidebar-primary": "oklch(0.75 0.02 260)",
    "--sidebar-primary-foreground": "oklch(0.145 0 0)",
    "--ring": "oklch(0.65 0.03 260)",
    "--accent": "oklch(0.32 0.02 260)",
    "--accent-foreground": "oklch(0.985 0 0)",
  },
};

const zinc: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.32 0.01 280)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.32 0.01 280)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.45 0.01 280)",
    "--accent": "oklch(0.94 0.005 280)",
    "--accent-foreground": "oklch(0.205 0.01 280)",
  },
  dark: {
    "--primary": "oklch(0.78 0.01 280)",
    "--primary-foreground": "oklch(0.145 0 0)",
    "--sidebar-primary": "oklch(0.78 0.01 280)",
    "--sidebar-primary-foreground": "oklch(0.145 0 0)",
    "--ring": "oklch(0.62 0.02 280)",
    "--accent": "oklch(0.32 0.01 280)",
    "--accent-foreground": "oklch(0.985 0 0)",
  },
};

const blue: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.55 0.2 260)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.55 0.2 260)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.5 0.18 260)",
    "--accent": "oklch(0.92 0.06 260)",
    "--accent-foreground": "oklch(0.25 0.12 260)",
  },
  dark: {
    "--primary": "oklch(0.62 0.19 260)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.62 0.19 260)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.58 0.17 260)",
    "--accent": "oklch(0.32 0.08 260)",
    "--accent-foreground": "oklch(0.92 0.06 260)",
  },
};

const emerald: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.52 0.14 165)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.52 0.14 165)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.48 0.13 165)",
    "--accent": "oklch(0.93 0.05 165)",
    "--accent-foreground": "oklch(0.22 0.08 165)",
  },
  dark: {
    "--primary": "oklch(0.65 0.15 165)",
    "--primary-foreground": "oklch(0.145 0 0)",
    "--sidebar-primary": "oklch(0.65 0.15 165)",
    "--sidebar-primary-foreground": "oklch(0.145 0 0)",
    "--ring": "oklch(0.6 0.14 165)",
    "--accent": "oklch(0.3 0.06 165)",
    "--accent-foreground": "oklch(0.93 0.05 165)",
  },
};

const rose: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.55 0.2 15)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.55 0.2 15)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.5 0.18 15)",
    "--accent": "oklch(0.94 0.04 15)",
    "--accent-foreground": "oklch(0.3 0.12 15)",
  },
  dark: {
    "--primary": "oklch(0.62 0.19 15)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.62 0.19 15)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.58 0.17 15)",
    "--accent": "oklch(0.32 0.08 15)",
    "--accent-foreground": "oklch(0.94 0.04 15)",
  },
};

const amber: { light: AppearanceColorTokens; dark: AppearanceColorTokens } = {
  light: {
    "--primary": "oklch(0.72 0.16 75)",
    "--primary-foreground": "oklch(0.2 0.02 75)",
    "--sidebar-primary": "oklch(0.72 0.16 75)",
    "--sidebar-primary-foreground": "oklch(0.2 0.02 75)",
    "--ring": "oklch(0.65 0.15 75)",
    "--accent": "oklch(0.95 0.06 85)",
    "--accent-foreground": "oklch(0.28 0.08 75)",
  },
  dark: {
    "--primary": "oklch(0.75 0.14 75)",
    "--primary-foreground": "oklch(0.2 0.02 75)",
    "--sidebar-primary": "oklch(0.75 0.14 75)",
    "--sidebar-primary-foreground": "oklch(0.2 0.02 75)",
    "--ring": "oklch(0.68 0.13 75)",
    "--accent": "oklch(0.35 0.08 75)",
    "--accent-foreground": "oklch(0.95 0.06 85)",
  },
};

export const APPEARANCE_COLOR_SCHEMES: Record<AppearanceColorSchemeId, { light: AppearanceColorTokens; dark: AppearanceColorTokens }> = {
  teal,
  slate,
  zinc,
  blue,
  emerald,
  rose,
  amber,
};

/** Preview swatch (solid) for selects — light mode hue */
export const APPEARANCE_COLOR_SWATCH: Record<AppearanceColorSchemeId, string> = {
  teal: "oklch(0.68 0.15 200)",
  slate: "oklch(0.45 0.02 260)",
  zinc: "oklch(0.45 0.01 280)",
  blue: "oklch(0.55 0.2 260)",
  emerald: "oklch(0.52 0.14 165)",
  rose: "oklch(0.55 0.2 15)",
  amber: "oklch(0.72 0.16 75)",
};

export const DEFAULT_APPEARANCE_COLOR_SCHEME: AppearanceColorSchemeId = "teal";

export const APPEARANCE_COLOR_LABELS: Record<AppearanceColorSchemeId, string> = {
  teal: "Teal (Default)",
  slate: "Slate",
  zinc: "Zinc",
  blue: "Blue",
  emerald: "Emerald",
  rose: "Rose",
  amber: "Amber",
};

export const LS_APPEARANCE_THEME = "aquadock_appearance_theme";
export const LS_APPEARANCE_LOCALE = "aquadock_appearance_locale";
export const LS_APPEARANCE_COLOR = "aquadock_appearance_color_scheme";
