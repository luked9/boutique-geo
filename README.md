# Boutique GEO

NFC + QR Review Kiosk with Square Integration + AI Review Drafts

## Overview

Boutique GEO is an NFC + QR review kiosk system designed for boutique retail stores that captures customer feedback at point-of-sale and helps customers post reviews to Google, Yelp, or Apple Maps.

### What It Does

The system solves a common retail problem: getting customers to leave online reviews. It works by:

1. **Integrating with Square POS** — When a customer completes a purchase, the system automatically captures the transaction details
2. **AI-generating review drafts** — Using OpenAI, it creates natural review text based on the star rating and actual items purchased
3. **Enabling frictionless posting** — Customers scan a QR code on their phone and can copy the pre-written review to post on their preferred platform

### How It Works (Customer Flow)

1. Customer pays via Square POS
2. iPad kiosk prompts them to rate their experience (1-5 stars)
3. AI generates a contextual review draft based on their rating and purchased items
4. Customer approves the review and scans a QR code
5. Their phone shows the review text with one-tap copy and links to Google, Yelp, or Apple Maps
6. Customer posts the review from their own account (no forced logins)

### Three Components

| Component | Description |
|-----------|-------------|
| **Backend** | Node.js/Express API with PostgreSQL, Square OAuth, and OpenAI integration |
| **iPad App** | SwiftUI kiosk interface for in-store checkout displays |
| **Landing Pages** | Mobile-optimized pages for customers to copy and post reviews |

### Key Value Proposition

- Reduces friction in getting reviews by pre-writing contextual drafts
- Maintains authenticity since customers post from their own accounts
- Integrates seamlessly with existing Square POS workflows
- Tracks all interactions with audit logging

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
