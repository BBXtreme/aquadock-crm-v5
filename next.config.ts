/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config – force absolute root path
  turbopack: {
    root: process.cwd(), // absolute path, recommended by Next.js
  },
};

export default nextConfig;