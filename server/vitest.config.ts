import { defineConfig } from 'vitest/config';

// Load test env before anything imports config/env.ts. Workers inherit process.env.
process.loadEnvFile('.env.test');

export default defineConfig({
  test: {
    globalSetup: './src/test/global-setup.ts',
  },
});
