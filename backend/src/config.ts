import { z } from 'zod';

/**
 * Preprocessor: convert empty strings to undefined.
 * Railway (and other PaaS) often set env vars to "" instead of leaving them unset.
 * Without this, Zod's .optional() won't trigger and .url() etc. will fail on "".
 */
const emptyToUndefined = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().optional(),
);

const emptyToUndefinedUrl = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().url().optional(),
);

const configSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Security
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 characters (32 bytes hex)'),

  // Square (optional - provider only registers if configured)
  SQUARE_APP_ID: emptyToUndefined,
  SQUARE_APP_SECRET: emptyToUndefined,
  SQUARE_WEBHOOK_SIGNATURE_KEY: emptyToUndefined,
  SQUARE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),

  // Shopify (optional - enable when needed)
  SHOPIFY_CLIENT_ID: emptyToUndefined,
  SHOPIFY_CLIENT_SECRET: emptyToUndefined,
  SHOPIFY_WEBHOOK_SECRET: emptyToUndefined,

  // Lightspeed (optional - enable when needed)
  LIGHTSPEED_CLIENT_ID: emptyToUndefined,
  LIGHTSPEED_CLIENT_SECRET: emptyToUndefined,
  LIGHTSPEED_WEBHOOK_SECRET: emptyToUndefined,

  // Toast (optional - enable when needed)
  TOAST_CLIENT_ID: emptyToUndefined,
  TOAST_CLIENT_SECRET: emptyToUndefined,
  TOAST_WEBHOOK_SECRET: emptyToUndefined,

  // AI (optional - review generation disabled if not set)
  AI_API_KEY: emptyToUndefined,
  AI_API_BASE_URL: emptyToUndefinedUrl.default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),

  // Firebase Admin (optional - auth disabled if not set)
  FIREBASE_PROJECT_ID: emptyToUndefined,
  FIREBASE_CLIENT_EMAIL: emptyToUndefined,
  FIREBASE_PRIVATE_KEY: emptyToUndefined,

  // App
  APP_BASE_URL: emptyToUndefinedUrl.default('http://localhost:3000'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    const parsed = configSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`).join('\n');
      // Throw instead of process.exit() so start.ts can catch and log before exit
      throw new Error(`Configuration validation failed:\n${msg}`);
    }
    throw error;
  }
}

export const config = loadConfig();
