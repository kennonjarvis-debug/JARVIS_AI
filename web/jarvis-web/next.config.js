/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Use standalone output for Netlify serverless
  output: 'standalone',

  // Disable static optimization to allow client-side hooks
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;

