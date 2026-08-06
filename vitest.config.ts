import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      src: resolve(__dirname, './src'),
    },
  },
});
