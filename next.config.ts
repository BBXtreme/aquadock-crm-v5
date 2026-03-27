/// <reference types="node" />

import pkg from "./package.json" with { type: "json" };

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  // ─────────────────────────────────────────────────────────────
  // Public environment variables (available in browser + server)
  // ─────────────────────────────────────────────────────────────
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
