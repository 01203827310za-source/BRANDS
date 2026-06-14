/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', '@prisma/client', 'node-cron', 'playwright', 'playwright-core'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    if (isServer) {
      // playwright-core is loaded via dynamic import at runtime only.
      // Mark it external so webpack never tries to bundle or resolve it
      // during build — it won't be installed locally but IS present in Docker.
      const prev = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(prev) ? prev : [prev]),
        ({ request }, callback) => {
          if (request === 'playwright' || request === 'playwright-core') return callback(null, `commonjs ${request}`);
          callback();
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
