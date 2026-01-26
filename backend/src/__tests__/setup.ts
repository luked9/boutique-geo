import { PrismaClient } from '@prisma/client';

// Mock Prisma client for tests
jest.mock('../lib/prisma', () => ({
  prisma: {
    store: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    reviewSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditEvent: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

// Mock logger
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.SQUARE_APP_ID = 'test-app-id';
process.env.SQUARE_APP_SECRET = 'test-app-secret';
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'test-webhook-key';
process.env.AI_API_KEY = 'test-ai-key';
process.env.APP_BASE_URL = 'http://localhost:3000';

// Global test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
  jest.clearAllMocks();
});
