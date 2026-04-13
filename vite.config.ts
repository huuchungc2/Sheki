import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Lắng nghe mọi interface để truy cập từ điện thoại/máy khác: http://192.168.x.x:5173
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
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
      // Dùng 127.0.0.1 thay vì localhost để tránh một số máy Windows ưu tiên IPv6 (::1) trong khi Node chỉ bind IPv4
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
