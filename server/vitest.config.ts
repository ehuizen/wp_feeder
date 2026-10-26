import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Test env from .env.test. Assigned to process.env for global setup (main process),
// and passed as test.env for workers, because Vitest sets its own BASE_URL ("/") there.
const testEnv = parseEnv(readFileSync('.env.test', 'utf8'));
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    env: testEnv,
    globalSetup: './src/test/global-setup.ts',
  },
});
