import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    passWithNoTests: true,
    globals: true,
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['client/src/**/*.test.{ts,tsx}'],
          setupFiles: ['client/src/test-setup.ts'],
        },
      },
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/src/**/*.test.ts'],
        },
      },
    ],
  },
});
