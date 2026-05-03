import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const siteUrl = (env.VITE_SITE_URL || env.APP_URL || '')
    .trim()
    .replace(/\/$/, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-og-meta',
        transformIndexHtml(html) {
          const ogImage = siteUrl
            ? `${siteUrl}/og-image.png`
            : '/og-image.png';
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
        },
        "/uploads": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
