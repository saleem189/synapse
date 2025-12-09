/** @type {import('next').NextConfig} */
// Sentry webpack plugin will be added automatically if @sentry/nextjs is installed
// Run: npx @sentry/wizard@latest -i nextjs

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  // Turbopack automatically handles Node.js module exclusion for client bundles
  // No explicit configuration needed - Turbopack handles this automatically
  turbopack: {},

  // Webpack configuration (fallback for --webpack flag or if Turbopack is disabled)
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Exclude Node.js built-in modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        'fs/promises': false,
        http: false,
        https: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        os: false,
        child_process: false,
        string_decoder: false,
      };

      // Ignore Node.js modules and bcryptjs for client bundle
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(fs|path|fs\/promises|http|https|net|tls|crypto|stream|url|zlib)$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^bcryptjs$/,
        })
      );
      
      // Mark bcryptjs as external to prevent bundling
      const originalExternals = config.externals || [];
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          if (request === 'bcryptjs' || request === 'bcrypt') {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      ];
    }
    return config;
  },

  // Enable compression
  compress: true,

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
  },


  // Note: Request size limits are handled in API route handlers
  // In Next.js 13+ App Router, body size limits should be enforced in:
  // 1. Route handlers (check request body size before processing)
  // 2. Middleware (validate request size early)
  // See: lib/middleware/validate-request.ts for validation

  // CRITICAL FIX: Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            // Allow microphone for same origin (self) to enable voice recording
            // Camera and geolocation remain disabled for security
            value: 'camera=(), microphone=(self), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              // Allow connections to self (for tunnel route /monitoring) and Sentry servers
              // With tunnel route enabled, Sentry uses /monitoring which is 'self'
              // Also allow direct Sentry connections as fallback
              "connect-src 'self' ws: wss: https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.sentry.io",
              // Allow workers for Session Replay (blob: URLs)
              "worker-src 'self' blob:",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

// Wrap with bundle analyzer first, then Sentry
const configWithAnalyzer = withBundleAnalyzer(nextConfig);

module.exports = withSentryConfig(
  configWithAnalyzer,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "chatflow",
    project: "javascript-nextjs",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: The route "/monitoring" is excluded from middleware to allow Sentry requests.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
