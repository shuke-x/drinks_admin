import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 开发环境将 /api 前缀代理到后端,规避 CORS;目标地址用 VITE_PROXY_TARGET 覆盖
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/three/')) return id.includes('three.core') ? 'three-core' : 'three-renderer';
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'https://dash.shuke.me',
          changeOrigin: true,
        },
      },
    },
  };
});
