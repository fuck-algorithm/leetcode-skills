import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const MIN_PORT = 30000;
const MAX_PORT = 65535;

function pickPort(): number {
  const fromEnv = Number(process.env.PORT ?? '');
  if (Number.isInteger(fromEnv) && fromEnv >= MIN_PORT && fromEnv <= MAX_PORT) {
    return fromEnv;
  }
  return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
}

const appBase = process.env.VITE_APP_BASE ?? '/leetcode-{题号}-{slug}-visualization/';

export default defineConfig({
  plugins: [react()],
  base: appBase,
  server: {
    port: pickPort(),
    strictPort: false
  },
  preview: {
    port: pickPort()
  }
});
