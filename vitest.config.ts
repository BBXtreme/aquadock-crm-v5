import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],

  resolve: {
    tsconfigPaths: true,   // Native Vite support – removes the plugin warning
  },

  test: {
    environment: "jsdom",
    globals: false,        // We use explicit imports – keeps tsc clean
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/supabase/**",
      "**/coverage/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/*.d.ts",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/.next/**",
      ],
    },
    testTimeout: 10000,
    pool: "threads",
  },
});