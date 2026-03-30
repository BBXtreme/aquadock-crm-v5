// next.config.ts
/* Next.js configuration file
This file is used to customize the behavior of the Next.js framework.
In this configuration, we are enabling Turbopack for faster builds and 
setting up environment variables that can be accessed in both the browser and server.
The version of the app is injected from the package.json file, allowing 
for easy tracking of the deployed version.
*/
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
