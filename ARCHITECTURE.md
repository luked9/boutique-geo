# Boutique GEO - Complete System Architecture

## System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   iPad App      │────▶│    Backend      │────▶│   PostgreSQL    │
│   (Kiosk)       │◀────│  (Node.js API)  │◀────│   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Square POS     │   │  OpenAI API     │   │  Customer Phone │
│  (Payments)     │   │  (AI Reviews)   │   │  (Landing Page) │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## What Each Component Does

### 1. PostgreSQL Database
Stores all persistent data:
- **Stores** - Boutique shops that use the system
- **Orders** - Purchase data from Square
- **Review Sessions** - Each customer interaction (pending → approved → posted)
- **Audit Events** - Tracking everything that happens

### 2. Backend API (Node.js/Express)
The brain of the system:
- Receives webhooks from Square when purchases happen
- Generates AI reviews using OpenAI
- Serves the mobile landing page for customers
- Provides API endpoints for the iPad app
- Encrypts sensitive tokens (Square OAuth)

### 3. iPad App (SwiftUI)
The customer-facing kiosk:
- Sits at the checkout counter
- Polls for new sessions every 7 seconds
- Shows star rating screen after purchases
- Displays AI-generated review for approval
- Shows QR code for customers to scan

### 4. External Services

| Service | Purpose |
|---------|---------|
| **Square POS** | Sends payment webhooks when customers buy |
| **OpenAI API** | Generates personalized review text |
| **Google Business Profile** | Where customers post their reviews |

---

## Complete Customer Flow

```
CUSTOMER BUYS SOMETHING AT BOUTIQUE
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Square POS processes payment                                │
│  2. Square sends webhook to your backend                        │
│  3. Backend creates a "pending review session"                  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. iPad (polling every 7 seconds) detects the new session      │
│  5. iPad shows: "HOW WAS YOUR EXPERIENCE?" with gold stars      │
│  6. Customer taps 4 or 5 stars                                  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Backend calls OpenAI to generate a review like:             │
│     "Loved my new silk scarf from Boutique Name! The quality    │
│      is exceptional and the staff was so helpful."              │
│  8. iPad shows the review: "READY TO SHARE - Yes / No Thanks"   │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. If Yes → iPad shows QR code                                 │
│  10. Customer scans with their phone                            │
│  11. Phone opens landing page with review + "Copy" button       │
│  12. Customer copies review, taps "Post on Google"              │
│  13. Google Business Profile opens, customer pastes & posts     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Options

### Option A: Local Development
```
PostgreSQL ──── Docker container on your Mac
Backend ─────── localhost:3000
iPad App ────── Simulator or real iPad on same WiFi
```

**Pros:** Free, fast iteration, easy debugging
**Cons:** Only works on your machine

### Option B: Cloud Development (Recommended)
```
PostgreSQL ──── Supabase (free tier)
Backend ─────── localhost:3000
iPad App ────── Simulator or real iPad
```

**Pros:** No Docker needed, real database, same DB for prod later
**Cons:** Need internet connection

### Option C: Full Production
```
PostgreSQL ──── Supabase / Railway / AWS RDS
Backend ─────── Railway / Render / Fly.io
iPad App ────── Real iPads at boutique locations
```

**Pros:** Real customers can use it
**Cons:** Costs money, needs domain/SSL

---

## The Store ID System

Each boutique gets a unique Store ID when they sign up:

```
store_demo123456
  │
  └── PUBLIC identifier for the boutique
```

**How it works:**
1. Boutique owner signs up (admin panel - future feature)
2. Backend creates Store record in PostgreSQL
3. Backend generates unique `store_abc123xyz` ID
4. Owner enters this ID in their iPad app
5. iPad is now "paired" to that store

**What's stored per store:**
- Store name and settings
- Square OAuth tokens (encrypted)
- Google Business Profile URL
- Review platform preference

---

## Why PostgreSQL (Not Firebase)?

| Feature | Firebase | PostgreSQL |
|---------|----------|------------|
| Data structure | Document (NoSQL) | Relational (SQL) |
| Queries | Limited | Powerful |
| Hosting | Firebase only | Anywhere |
| Cost | Pay per read/write | Predictable |
| Vendor lock-in | High | None |

PostgreSQL is better for Boutique GEO because:
- Structured relational data (stores → orders → sessions)
- Complex queries for analytics
- Industry standard
- Easy to host anywhere
- No vendor lock-in

---

## Required API Keys

| Service | Purpose | Required For |
|---------|---------|--------------|
| **Square** | Payment webhooks, OAuth | Production |
| **OpenAI** | AI review generation | Production |

**For local testing:**
- Square: Use `npm run mock:webhook` instead
- OpenAI: Backend has fallback text templates

---

## Data Flow Diagram

```
┌──────────────┐
│ Square POS   │
│ (Payment)    │
└──────┬───────┘
       │ webhook
       ▼
┌──────────────┐     ┌──────────────┐
│   Backend    │────▶│  PostgreSQL  │
│   (API)      │◀────│  (Database)  │
└──────┬───────┘     └──────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  iPad App    │  │   OpenAI     │
│  (Kiosk)     │  │   (AI Gen)   │
└──────┬───────┘  └──────────────┘
       │
       │ QR Code
       ▼
┌──────────────┐
│  Customer    │
│  Phone       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Google     │
│   Reviews    │
└──────────────┘
```

---

## Session States

```
PENDING ──────▶ DECLINED
    │
    ▼
APPROVED ─────▶ POSTED_INTENT
```

| State | Meaning |
|-------|---------|
| PENDING | Waiting for customer to rate |
| DECLINED | Customer said "No Thanks" |
| APPROVED | Customer approved the review |
| POSTED_INTENT | Customer clicked "Done" on landing page |

---

## Security Considerations

1. **Token Encryption**: Square OAuth tokens encrypted with libsodium
2. **Webhook Verification**: Square webhooks verified with HMAC-SHA256
3. **Public IDs**: Internal UUIDs never exposed, only public IDs
4. **No PII Storage**: No customer personal data stored
5. **HTTPS**: All production traffic over TLS

---

## File Structure

```
boutique-geo-v1/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation
│   │   └── templates/       # Landing page HTML
│   └── prisma/
│       └── schema.prisma    # Database schema
│
├── ipad-app/                # SwiftUI iPad app
│   └── BoutiqueGEO/
│       ├── Core/            # Config, Models, API
│       ├── Features/        # Screen views
│       └── UI/              # Components, Theme
│
├── docker-compose.yml       # Local PostgreSQL
├── SPEC.md                  # Technical specification
├── SETUP.md                 # External setup guide
└── ARCHITECTURE.md          # This file
```

---

## Quick Reference

### Start Local Development
```bash
# Database (Option 1: Docker)
docker compose up -d

# Database (Option 2: Supabase)
# Create project at supabase.com, copy connection string

# Backend
cd backend
cp .env.example .env
# Edit .env with database URL
npm install
npm run prisma:migrate
npm run seed
npm run dev

# Test
npm run mock:webhook
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<64-char-hex>
SQUARE_APP_ID=<from-square>
SQUARE_APP_SECRET=<from-square>
SQUARE_WEBHOOK_SIGNATURE_KEY=<from-square>
AI_API_KEY=<openai-key>
APP_BASE_URL=http://localhost:3000
```

### Key API Endpoints
```
GET  /api/v1/health                    # Health check
GET  /api/v1/kiosk/:storeId/next       # Get pending session
POST /api/v1/kiosk/:storeId/sessions/:id/rating   # Submit rating
POST /api/v1/kiosk/:storeId/sessions/:id/approve  # Approve review
POST /api/v1/kiosk/:storeId/sessions/:id/decline  # Decline review
GET  /r/:sessionId                     # Landing page (QR target)
GET  /tap/:storeId                     # Landing page (NFC target)
```
