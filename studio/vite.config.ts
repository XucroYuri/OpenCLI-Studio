import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3113',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'dist', 'studio'),
    emptyOutDir: true,
  },
});
