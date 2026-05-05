import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const siteUrl = (env.VITE_SITE_URL || env.APP_URL || '')
    .trim()
    .replace(/\/$/, '');

  let viteBase = '/';

  /** IP máy đang mở trình duyệt (theo TCP tới Vite); gửi xuống API vì proxy tới :3000 khiến Node chỉ thấy 127.0.0.1. */
  const forwardClientIpToBackend = (proxy: {on: (ev: string, fn: (...a: unknown[]) => void) => void}) => {
    proxy.on('proxyReq', (proxyReq: {setHeader: (k: string, v: string) => void}, req: {socket?: {remoteAddress?: string}}) => {
      const ip = req.socket?.remoteAddress;
      if (ip) proxyReq.setHeader('X-Forwarded-For', ip);
    });
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-og-meta',
        configResolved(config) {
          viteBase = config.base;
        },
        transformIndexHtml(html) {
          const base =
            viteBase.endsWith('/') ? viteBase : `${viteBase}/`;
          const assetUrl = (file: string) =>
            `${base}${file.replace(/^\//, '')}`.replace(/\/{2,}/g, '/');
          const ogImage = siteUrl
            ? `${siteUrl}/og-image.png`
            : assetUrl('og-image.png');
          const ogUrlMeta = siteUrl
            ? `<meta property="og:url" content="${siteUrl}/" />`
            : '';
          return html
            .replaceAll('__OG_IMAGE_SRC__', ogImage)
            .replace('__OG_URL_META_BLOCK__', ogUrlMeta);
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: Infinity,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      /* Vite 6+: chặn Host lạ (DNS rebinding). Cho phép mọi host trong dev để mở bằng IP LAN / hostname máy trên iPhone Safari. */
      allowedHosts: true,
      hmr:
        process.env.DISABLE_HMR === 'true'
          ? false
          : env.VITE_DEV_HMR_HOST
            ? {
                host: env.VITE_DEV_HMR_HOST,
                port: 5173,
                clientPort: 5173,
              }
            : true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
          configure: forwardClientIpToBackend,
        },
        "/uploads": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
          configure: forwardClientIpToBackend,
        },
      },
    },
  };
});
