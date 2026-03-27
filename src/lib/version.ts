// Version Management for the application. The version is read from an environment variable, allowing for easy updates without changing the codebase.
// src/lib/version.ts
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.5.19";
