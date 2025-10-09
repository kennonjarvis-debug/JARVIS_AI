/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    allowedDevOrigins: ['192.168.0.232:3003'],
  },
};

export default nextConfig;
