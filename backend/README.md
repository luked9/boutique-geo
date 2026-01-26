# Boutique GEO Backend

Node.js/TypeScript API server for the Boutique GEO review kiosk system.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL 15+ with Prisma ORM
- **Validation:** Zod
- **Logging:** Pino
- **Encryption:** sodium-native (libsodium)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start database (from project root)
docker-compose up -d

# Run migrations
npm run prisma:migrate

# Seed database with test data
npm run seed

# Start development server
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm test` | Run tests |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run seed` | Seed database with test data |
| `npm run mock:webhook` | Simulate Square webhook |

## API Endpoints

### Health
- `GET /api/v1/health` - Health check

### Stores
- `POST /api/v1/stores` - Create store
- `GET /api/v1/stores/:publicId` - Get store
- `PATCH /api/v1/stores/:publicId` - Update store

### Square Integration
- `GET /api/v1/square/oauth/start?storePublicId=xxx` - Start OAuth
- `GET /api/v1/square/oauth/callback` - OAuth callback
- `POST /api/v1/square/webhook` - Webhook handler

### Kiosk (iPad)
- `GET /api/v1/kiosk/:storePublicId/next` - Get pending session
- `POST /api/v1/kiosk/:storePublicId/sessions/:sessionId/rating` - Submit rating
- `POST /api/v1/kiosk/:storePublicId/sessions/:sessionId/approve` - Approve
- `POST /api/v1/kiosk/:storePublicId/sessions/:sessionId/decline` - Decline

### Landing Pages
- `GET /tap/:storePublicId` - Store landing page
- `GET /r/:sessionPublicId` - Session landing page
- `POST /api/v1/review/:sessionId/copied` - Log copy event
- `POST /api/v1/review/:sessionId/platform_clicked` - Log click event
- `POST /api/v1/review/:sessionId/done` - Mark as posted

## Project Structure

```
src/
├── index.ts              # Entry point
├── config.ts             # Configuration
├── lib/
│   ├── prisma.ts         # Prisma client
│   └── logger.ts         # Pino logger
├── controllers/
│   ├── health.controller.ts
│   ├── stores.controller.ts
│   ├── kiosk.controller.ts
│   ├── square.controller.ts
│   └── landing.controller.ts
├── services/
│   ├── square.service.ts
│   ├── session.service.ts
│   ├── reviewGen.service.ts
│   ├── tokenCrypto.service.ts
│   └── audit.service.ts
├── middleware/
│   ├── errorHandler.ts
│   ├── requestLogger.ts
│   ├── validate.ts
│   └── squareWebhookVerify.ts
├── routes/
│   └── index.ts
├── types/
│   └── dto.ts
├── utils/
│   ├── ids.ts
│   └── money.ts
├── static/
│   ├── landing.css
│   └── landing.js
└── templates/
    ├── landing.html
    └── connected.html
```

## Environment Variables

See `.env.example` for all required variables.

### Required
- `DATABASE_URL` - Postgres connection string
- `ENCRYPTION_KEY` - 32-byte hex key for token encryption
- `SQUARE_APP_ID` - Square application ID
- `SQUARE_APP_SECRET` - Square application secret
- `SQUARE_WEBHOOK_SIGNATURE_KEY` - Webhook signature key
- `AI_API_KEY` - OpenAI API key

### Optional
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: development)
- `LOG_LEVEL` - Log level (default: info)
- `SQUARE_ENV` - sandbox or production (default: sandbox)
- `AI_API_BASE_URL` - AI API endpoint (default: OpenAI)
- `AI_MODEL` - AI model (default: gpt-4o-mini)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- health.test.ts
```

## Mock Webhook

For local development without Square:

```bash
npm run mock:webhook
```

This creates a test order and pending review session.

## Database

### View data
```bash
npm run prisma:studio
```

### Reset database
```bash
npx prisma migrate reset
```

### Create migration
```bash
npx prisma migrate dev --name your_migration_name
```
