/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Use standalone output for Netlify serverless
  output: 'standalone',

  // Transpile packages that use ESM or have SSR issues
  transpilePackages: [],

  // Server-only packages that should never be bundled for client
  serverComponentsExternalPackages: [
    'ioredis',
    '@prisma/client',
    'bcryptjs',
    'speakeasy',
    'qrcode',
    'ua-parser-js',
  ],

  // Experimental features - consolidated
  experimental: {
    missingSuspenseWithCSRBailout: false,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Image Optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compression
  compress: true,

  // Performance optimizations
  swcMinify: true,
  productionBrowserSourceMaps: false,

  // Font optimization
  optimizeFonts: true,

  // Webpack optimizations - Let Next.js handle bundling for App Router
  webpack: (config, { dev }) => {
    // Production optimizations
    if (!dev) {
      // Tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        minimize: true,
      };
    }

    return config;
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
