/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Temporary - Use local Mac backend (your Mac IP: 192.168.0.232)
    NEXT_PUBLIC_API_URL: 'http://192.168.0.232:5001',
    NEXT_PUBLIC_BACKEND_URL: 'http://192.168.0.232:5001',
    NEXT_PUBLIC_WS_URL: 'ws://192.168.0.232:4000',
  },
};

export default nextConfig;
