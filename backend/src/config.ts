import { z } from 'zod';

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
  SQUARE_APP_ID: z.string().optional(),
  SQUARE_APP_SECRET: z.string().optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  SQUARE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),

  // Shopify (optional - enable when needed)
  SHOPIFY_CLIENT_ID: z.string().optional(),
  SHOPIFY_CLIENT_SECRET: z.string().optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().optional(),

  // Lightspeed (optional - enable when needed)
  LIGHTSPEED_CLIENT_ID: z.string().optional(),
  LIGHTSPEED_CLIENT_SECRET: z.string().optional(),
  LIGHTSPEED_WEBHOOK_SECRET: z.string().optional(),

  // Toast (optional - enable when needed)
  TOAST_CLIENT_ID: z.string().optional(),
  TOAST_CLIENT_SECRET: z.string().optional(),
  TOAST_WEBHOOK_SECRET: z.string().optional(),

  // AI (optional - review generation disabled if not set)
  AI_API_KEY: z.string().optional(),
  AI_API_BASE_URL: z.string().url().optional().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),

  // Firebase Admin (optional - auth disabled if not set)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // App
  APP_BASE_URL: z.string().url().optional().default('http://localhost:3000'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    const parsed = configSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();
