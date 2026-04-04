import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json'],
      include: ['features/**/*', 'services/**/*', 'components/**/*'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50
      }
    }
  }
});
