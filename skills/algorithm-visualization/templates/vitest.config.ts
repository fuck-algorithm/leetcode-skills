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
      // 覆盖率约束聚焦纯逻辑层；UI 组件由 Playwright 验收用例覆盖。
      include: ['features/**/*', 'services/**/*'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50
      }
    }
  }
});
