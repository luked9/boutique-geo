# Boutique GEO

NFC + QR Review Kiosk with Square Integration + AI Review Drafts

## Overview

Boutique GEO is a checkout kiosk system that captures customer ratings and generates AI-powered review drafts. Customers scan a QR code or tap an NFC tag to post reviews on Google/Yelp from their own phones.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Square POS    │────▶│     Backend     │◀────│    iPad App     │
│   (Webhooks)    │     │  (Node/TS/Pg)   │     │    (SwiftUI)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Landing Page   │
                        │  (Mobile Web)   │
                        └─────────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Xcode 15+ (for iPad app)
- Square Developer account
- OpenAI API key

### 1. Start Infrastructure
```bash
docker-compose up -d
```

### 2. Set Up Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

### 3. Test with Mock Webhook
```bash
cd backend
npm run mock:webhook
```

### 4. Run iPad App
1. Open `/ipad-app/BoutiqueGEO.xcodeproj` in Xcode
2. Select iPad simulator or device
3. Run (⌘R)

## Project Structure

```
/
├── backend/              # Node.js/TypeScript API server
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   └── static/       # Landing page assets
│   └── prisma/           # Database schema & migrations
├── ipad-app/             # SwiftUI iPad application
│   └── BoutiqueGEO/
├── SPEC.md               # Canonical specification
├── SETUP.md              # External setup guide
└── docker-compose.yml    # Local infrastructure
```

## Documentation

- [SPEC.md](./SPEC.md) — Technical specification
- [SETUP.md](./SETUP.md) — External service setup
- [backend/README.md](./backend/README.md) — Backend details
- [ipad-app/README.md](./ipad-app/README.md) — iPad app details

## Development Commands

```bash
# Infrastructure
docker-compose up -d      # Start Postgres
docker-compose down       # Stop infrastructure

# Backend
cd backend
npm run dev               # Start dev server
npm run build             # Build for production
npm run test              # Run tests
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio
npm run seed              # Seed database
npm run mock:webhook      # Simulate Square webhook

# iPad App
# Open BoutiqueGEO.xcodeproj in Xcode
# Build with ⌘B, Run with ⌘R
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/stores | Create store |
| GET | /api/v1/stores/:id | Get store |
| GET | /api/v1/square/oauth/start | Start OAuth |
| POST | /api/v1/square/webhook | Webhook handler |
| GET | /api/v1/kiosk/:store/next | Get pending session |
| POST | /api/v1/kiosk/:store/sessions/:id/rating | Submit rating |
| GET | /r/:sessionId | Session landing page |
| GET | /tap/:storeId | Store landing page |

## Flow

1. **Order Completed** — Square sends webhook
2. **Session Created** — Backend creates pending review session
3. **iPad Displays** — Shows "Rate your experience"
4. **Customer Rates** — Taps 1-5 stars
5. **AI Generates** — Backend creates review draft
6. **Consent** — Customer approves or declines
7. **Handoff** — QR code shown on iPad
8. **Customer Scans** — Opens landing page on phone
9. **Post Review** — Customer copies text and posts

## License

Proprietary — All rights reserved
