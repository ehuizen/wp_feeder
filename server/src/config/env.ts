// Checks every environment variable at startup; the server won't start if one is missing or wrong.
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  AUTH0_ISSUER_BASE_URL: z.url({ protocol: /^https$/ }),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  BASE_URL: z.url({ protocol: /^https?$/ }),
  // 32 random bytes as base64. Decoded once, only in lib/crypto.ts.
  ENCRYPTION_KEY: z.base64().refine(
    (key) => Buffer.from(key, 'base64').length === 32,
    'must be 32 bytes, base64 encoded',
  ),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // prettifyError lists field names and rules, never the values (which may be secrets).
    console.error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
