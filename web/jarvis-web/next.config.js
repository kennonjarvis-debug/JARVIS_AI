/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Use standalone output for Netlify serverless
  output: 'standalone',

  // Transpile packages that use ESM or have SSR issues
  transpilePackages: [
    'chart.js',
    'react-chartjs-2',
  ],

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
    optimizeCss: true,
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

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Prevent server-side bundling of client-only modules
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'chart.js': 'chart.js',
          'react-chartjs-2': 'react-chartjs-2',
        });
      }
    }

    // Production optimizations
    if (!dev) {
      // Tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        minimize: true,
      };

      // Bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Styles chunk
          styles: {
            name: 'styles',
            test: /\.(css|scss)$/,
            chunks: 'all',
            enforce: true,
          },
        },
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
