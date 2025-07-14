/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TODO: Fix TypeScript errors and set this back to false
    ignoreBuildErrors: true,
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Security headers are handled by vercel.json for Vercel deployments
  // For other platforms, use this configuration:
  async headers() {
    return process.env.VERCEL
      ? []
      : [
          {
            source: '/:path*',
            headers: [
              {
                key: 'X-DNS-Prefetch-Control',
                value: 'on',
              },
              {
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
              },
              {
                key: 'X-Content-Type-Options',
                value: 'nosniff',
              },
              {
                key: 'X-Frame-Options',
                value: 'DENY',
              },
              {
                key: 'X-XSS-Protection',
                value: '1; mode=block',
              },
              {
                key: 'Referrer-Policy',
                value: 'strict-origin-when-cross-origin',
              },
              {
                key: 'Permissions-Policy',
                value: 'camera=(), microphone=(), geolocation=()',
              },
            ],
          },
        ];
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
  },

  // Vercel-specific optimizations
  ...(process.env.VERCEL && {
    // Standalone output for optimal Docker/serverless deployments
    output: 'standalone',

    // Optimize for Vercel's Edge Network
    swcMinify: true,

    // Enable React strict mode for better debugging
    reactStrictMode: true,
  }),
};

export default nextConfig;
