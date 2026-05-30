import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Allow YouTube embeds in iframes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://i.ytimg.com https://img.youtube.com",
              "frame-src https://www.youtube.com https://youtube.com",
              "connect-src 'self' http://localhost:8000",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
