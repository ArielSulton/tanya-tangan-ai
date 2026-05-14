/* eslint-disable @typescript-eslint/require-await */
import type { NextConfig } from 'next'
import path from 'node:path'

const mediapipeHandsShim = path.resolve(__dirname, 'src/lib/gesture/mediapipe-hands-shim.ts')

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://backend:8000'}/api/v1/:path*`,
      },
    ]
  },

  // Environment variables for client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    NEXT_PUBLIC_GRAFANA_URL: process.env.NEXT_PUBLIC_GRAFANA_URL ?? 'http://localhost:3030',
    // Supabase configuration - explicitly set defaults for client-side
    NEXT_PUBLIC_ENABLE_SUPABASE_AUTH: process.env.NEXT_PUBLIC_ENABLE_SUPABASE_AUTH ?? 'false',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    // Static-gesture inference engine selector. 'fingerpose' (default) uses
    // the rule-based path; 'mlp' loads the trained TFJS classifier under
    // /models/static/. If 'mlp' is set but model files are missing, the
    // engine auto-falls-back to fingerpose at runtime.
    NEXT_PUBLIC_STATIC_ENGINE: process.env.NEXT_PUBLIC_STATIC_ENGINE ?? 'fingerpose',
  },

  // Generate build ID to force dynamic rendering for problematic pages
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Image optimization
  images: {
    remotePatterns: [
      // Development localhost patterns
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      // External image sources
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      // Production domain patterns
      {
        protocol: 'https',
        hostname: 'pensyarat.my.id',
      },
      {
        protocol: 'https',
        hostname: 'api.pensyarat.my.id',
      },
      {
        protocol: 'https',
        hostname: 'grafana.pensyarat.my.id',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: [
        // Development origins
        'localhost:3000',
        'localhost:5000',
        '127.0.0.1:3000',
        '127.0.0.1:5000',
        // Production origins
        'pensyarat.my.id',
        'api.pensyarat.my.id',
      ],
    },
  },

  // Turbopack alias — expects a workspace-relative path string (NOT absolute).
  // Webpack accepts the resolved absolute path; here we point to the same shim.
  turbopack: {
    resolveAlias: {
      '@mediapipe/hands': './src/lib/gesture/mediapipe-hands-shim.ts',
    },
  },

  // Webpack configuration (for production builds)
  webpack: (config, { dev, isServer }) => {
    // @mediapipe/hands ships as a UMD script (window.Hands), not an ES module.
    // hand-pose-detection statically imports { Hands } from it, so strict
    // bundlers fail. Alias to a shim that re-exports window.Hands; the real
    // script is loaded at runtime via solutionPath on a CDN URL.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mediapipe/hands$': mediapipeHandsShim,
      }
    }

    // Only apply webpack config for production builds
    if (!dev) {
      // Handle Node.js modules that aren't available in browser environment
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          stream: false,
          util: false,
          url: false,
          zlib: false,
          http: false,
          https: false,
          assert: false,
          os: false,
          path: false,
        }
      }
    }

    return config
  },

  // TypeScript configuration - Skip for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint configuration - Skip for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
