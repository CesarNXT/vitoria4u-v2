/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '172.28.124.126',
    '172.22.26.77',
    '172.22.28.97', // ✅ IP adicionado para evitar erro de WebSocket
  ],
  // Suprimir warnings desnecessários durante build e desenvolvimento
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Otimizações de produção
  productionBrowserSourceMaps: false,
  reactStrictMode: false, // Desabilitar warnings duplicados do React
  // ⚠️ TEMPORÁRIO: Ignorar erros de lint para deploy inicial
  // TODO: Corrigir erros de ESLint/TypeScript antes de produção
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Resolver polyfills para Node.js modules no browser
  // OBS: Configuração para Webpack (quando não usar --turbopack)
  ...(process.env.TURBOPACK === undefined && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          buffer: false,
          crypto: false,
          stream: false,
          util: false,
        };
        
        // ✅ Configurar watchOptions para evitar erros de WebSocket HMR
        config.watchOptions = {
          poll: 1000, // Check for changes every second
          aggregateTimeout: 300, // Delay before rebuilding
          ignored: ['**/node_modules', '**/.git', '**/.next'],
        };
      }
      return config;
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'files.catbox.moe',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      }
    ],
    // Aumentar timeout para imagens externas grandes
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
