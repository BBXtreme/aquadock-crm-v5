/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: ".",  // Force current directory as root (ignores workspace.yaml)
  },
}

export default nextConfig