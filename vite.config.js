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
    plugins: [react()],
    base: '/portfolio-balancer-client/',
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'build',
      sourcemap: true,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  };
});
