import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    passWithNoTests: true,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['client/src/**/*.test.{ts,tsx}', 'server/src/**/*.test.ts'],
  },
});
