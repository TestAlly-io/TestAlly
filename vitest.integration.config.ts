import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      include: ['tests/integration/**/*.test.ts'],
      testTimeout: 300_000,
      passWithNoTests: true,
      env,
    },
  };
});
