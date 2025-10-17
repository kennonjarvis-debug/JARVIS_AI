/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure static files in `public/` are served (Next does this by default)

  // Disable static optimization to allow client-side hooks
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;

