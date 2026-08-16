import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';

const ownerPortalCopyPlugin = (): Plugin => ({
  name: 'copy-owner-portal',
  closeBundle() {
    const source = path.resolve(__dirname, 'owner.html');
    const outDir = path.resolve(__dirname, 'dist');
    const target = path.join(outDir, 'owner.html');
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
    }
  },
});

export default defineConfig(() => {
  return {
    base: '/Mario-/',
    plugins: [react(), tailwindcss(), ownerPortalCopyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
