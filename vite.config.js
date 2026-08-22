import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function assertApiBaseUrl() {
  const apiBaseUrl = process.env.VITE_API_BASE_URL;
  if (!apiBaseUrl || apiBaseUrl === 'undefined') {
    throw new Error(
      'VITE_API_BASE_URL is required for production builds. Set it in .env or CI secrets.',
    );
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    assertApiBaseUrl();
  }

  return {
    base: '/portfolio-balancer-client/',
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'build',
      sourcemap: false,
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
              return 'react-vendor';
            }
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  };
});
