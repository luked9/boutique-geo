# Boutique GEO — Canonical Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-23
**Status:** ACTIVE DEVELOPMENT

---

## 1. Product Overview

Boutique GEO is an NFC + QR review kiosk system for boutique retail stores. It captures customer ratings at checkout and generates AI-powered review drafts that customers can post to Google/Yelp on their own phones.

### Core Flow
1. Customer completes purchase via Square POS
2. Square webhook notifies backend → creates pending review session
3. iPad kiosk displays "Rate your experience" with 5 stars
4. Customer taps rating (1-5 stars)
5. Backend generates AI review draft based on order items
6. Customer consents to use the review
7. iPad shows QR code linking to mobile landing page
8. Customer scans QR (or taps NFC tag) on their phone
9. Landing page shows review text with Copy + "Post on Google" buttons
10. Customer posts review on their own phone
11. Kiosk resets for next customer

---

## 2. Non-Negotiable Constraints

| ID | Constraint |
|----|------------|
| A | iPad only — no iPhone support |
| B | Customer posts on their own phone — we do NOT log them into platforms |
| C | No email/SMS links in V1 |
| D | No auto-posting to review platforms |
| E | Passive NFC tags only (no plugged-in NFC reader) |
| F | Square OAuth for store connection |
| G | Webhook signature verification required |
| H | Token encryption at rest (libsodium/secretbox or AES-GCM) |
| I | Local dev with Docker Compose + Postgres |
| J | Production-grade structure: typed, logged, error-handled |

---

## 3. Architecture

### 3.1 Components

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

### 3.2 URL Strategy

| URL Pattern | Purpose |
|-------------|---------|
| `/r/{sessionPublicId}` | Session-specific landing (QR code target) |
| `/tap/{storePublicId}` | Store-level landing (NFC tag target) |

- QR codes on iPad use session-specific URLs (always accurate)
- NFC tags use store-level URLs (shows most recent approved session)

### 3.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Backend Runtime | Node.js 20+ |
| Backend Framework | Express.js |
| Database | PostgreSQL 15+ |
| ORM | Prisma |
| iPad App | SwiftUI (iPadOS 17+) |
| Landing Page | Vanilla HTML/CSS/JS |
| Container | Docker Compose |

---

## 4. Data Model

### 4.1 stores
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| publicId | String | Unique, URL-safe (e.g., `store_abc123`) |
| name | String | Store display name |
| primaryReviewPlatform | Enum | GOOGLE, YELP, APPLE_MAPS |
| reviewDestinationUrl | String | Platform-specific review URL |
| squareMerchantId | String? | From Square OAuth |
| squareLocationId | String? | Selected location |
| accessTokenEnc | String? | Encrypted Square access token |
| refreshTokenEnc | String? | Encrypted Square refresh token |
| tokenExpiresAt | DateTime? | Token expiration |
| lastApprovedSessionId | String? | FK to most recent approved session |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 4.2 orders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| storeId | UUID | FK to stores |
| squareOrderId | String | Unique |
| totalAmount | Int | Cents |
| currency | String | e.g., "USD" |
| lineItemsJson | JSONB | Array of {name, quantity, amount} |
| createdAt | DateTime | |

### 4.3 review_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| publicId | String | Unique, URL-safe (e.g., `sess_xyz789`) |
| storeId | UUID | FK to stores |
| orderId | UUID? | FK to orders (nullable for future manual sessions) |
| status | Enum | PENDING, DECLINED, APPROVED, POSTED_INTENT |
| starRating | Int? | 1-5 |
| generatedReviewText | Text? | AI-generated review |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 4.4 audit_events
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| storeId | UUID | FK to stores |
| reviewSessionId | UUID? | FK to review_sessions |
| eventType | String | e.g., RATING_SUBMITTED, APPROVED, COPIED, PLATFORM_CLICKED |
| payload | JSONB | Event-specific data |
| createdAt | DateTime | |

---

## 5. API Endpoints

### 5.1 Health
```
GET /api/v1/health
Response: { ok: true, version: "1.0.0", time: "ISO8601" }
```

### 5.2 Stores
```
POST /api/v1/stores
Body: { name, primaryReviewPlatform, reviewDestinationUrl }
Response: { id, publicId, name, primaryReviewPlatform, reviewDestinationUrl, squareConnected }

GET /api/v1/stores/:publicId
Response: { id, publicId, name, ... }

PATCH /api/v1/stores/:publicId
Body: { name?, primaryReviewPlatform?, reviewDestinationUrl? }
```

### 5.3 Square OAuth
```
GET /api/v1/square/oauth/start?storePublicId=xxx
→ Redirects to Square OAuth

GET /api/v1/square/oauth/callback?code=xxx&state=xxx
→ Exchanges code, stores encrypted tokens
→ Returns HTML: "Connected. You can close this window."

POST /api/v1/square/webhook
→ Verifies signature
→ Processes payment/order events
→ Creates review_session
```

### 5.4 Kiosk (iPad)
```
GET /api/v1/kiosk/:storePublicId/next
Response: { session: { publicId, status, createdAt } | null, order: { totalAmount, currency, items } | null }

POST /api/v1/kiosk/:storePublicId/sessions/:sessionPublicId/rating
Body: { starRating: 1-5 }
Response: { generatedReviewText: "..." }

POST /api/v1/kiosk/:storePublicId/sessions/:sessionPublicId/approve
Response: { ok: true }

POST /api/v1/kiosk/:storePublicId/sessions/:sessionPublicId/decline
Response: { ok: true }
```

### 5.5 Landing Pages
```
GET /tap/:storePublicId
→ Returns HTML for most recent approved session

GET /r/:sessionPublicId
→ Returns HTML for specific session

POST /api/v1/review/:sessionPublicId/copied
→ Logs COPIED event

POST /api/v1/review/:sessionPublicId/platform_clicked
Body: { platform: "GOOGLE" | "YELP" | "APPLE_MAPS" }
→ Logs PLATFORM_CLICKED event

POST /api/v1/review/:sessionPublicId/done
→ Sets status=POSTED_INTENT
```

---

## 6. AI Review Generation

### 6.1 Configuration
| Variable | Default | Notes |
|----------|---------|-------|
| AI_API_BASE_URL | https://api.openai.com/v1 | OpenAI-compatible |
| AI_API_KEY | (required) | API key |
| AI_MODEL | gpt-4o-mini | Model identifier |

### 6.2 Prompt Template
```
SYSTEM:
You write short, natural customer reviews for local boutiques.
You must be truthful and only reference purchase items provided.
No mention of AI. No promotions. 1–3 sentences.

USER:
Store: {storeName}
Star rating: {starRating}/5
Items purchased:
- {qty}x {itemName}
Write a {tone} review (1–3 sentences). Avoid unverifiable claims.
```

### 6.3 Tone Mapping
| Rating | Tone |
|--------|------|
| 5 | enthusiastic, warm |
| 4 | positive, confident |
| 3 | neutral, polite |
| 1-2 | calm, factual, non-defamatory |

### 6.4 Constraints
- Max 400 characters
- Fallback to template if AI fails

---

## 7. iPad App Screens

### 7.1 Flow
```
PairingView → IdleView → RatingView → ConsentView → HandoffView → ThankYouView → IdleView
                  ↑                        ↓ (decline)
                  └────────────────────────┘
```

### 7.2 Screens
| Screen | Purpose |
|--------|---------|
| PairingView | Enter storePublicId (first launch only) |
| IdleView | Attract screen, polls for pending sessions |
| RatingView | 5 large tappable stars |
| ConsentView | Shows AI review, Yes/No buttons |
| HandoffView | QR code + "Scan to post" instructions |
| ThankYouView | Brief thank you (2-3 seconds) |

### 7.3 Polling
- IdleView polls `/kiosk/:store/next` every 5-10 seconds
- Auto-transitions when session found

### 7.4 Timeouts
- HandoffView: 30 seconds then reset
- All screens: graceful error handling

---

## 8. Security Requirements

### 8.1 Token Encryption
- Use libsodium secretbox or AES-256-GCM
- Key stored in environment variable (ENCRYPTION_KEY)
- Never log decrypted tokens

### 8.2 Webhook Verification
- Verify Square webhook signatures using SQUARE_WEBHOOK_SIGNATURE_KEY
- Reject requests with invalid signatures
- Log verification failures

### 8.3 Input Validation
- Validate all request bodies with zod
- Sanitize user inputs
- Rate limiting on public endpoints

---

## 9. Environment Variables

### 9.1 Required
| Variable | Description |
|----------|-------------|
| DATABASE_URL | Postgres connection string |
| ENCRYPTION_KEY | 32-byte hex key for token encryption |
| SQUARE_APP_ID | Square application ID |
| SQUARE_APP_SECRET | Square application secret |
| SQUARE_WEBHOOK_SIGNATURE_KEY | Webhook signature key |
| AI_API_KEY | OpenAI API key |

### 9.2 Optional
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment |
| SQUARE_ENV | sandbox | sandbox or production |
| AI_API_BASE_URL | https://api.openai.com/v1 | AI API base |
| AI_MODEL | gpt-4o-mini | AI model |
| LOG_LEVEL | info | Logging level |

---

## 10. Development Commands

```bash
# Start infrastructure
docker-compose up -d

# Backend development
cd backend
npm install
npm run prisma:migrate
npm run seed
npm run dev

# Mock webhook for testing
npm run mock:webhook

# Run tests
npm test
```

---

## 11. Acceptance Criteria

- [ ] Mock webhook creates pending session
- [ ] iPad app fetches pending session
- [ ] Rating submission generates AI review
- [ ] Approve updates lastApprovedSessionId
- [ ] `/tap/:store` shows latest approved review
- [ ] `/r/:session` shows specific review
- [ ] Copy button logs audit event
- [ ] Platform click logs audit event
- [ ] Done button sets POSTED_INTENT status
- [ ] Full flow works end-to-end locally

---

## Appendix A: Public ID Generation

Format: `{prefix}_{nanoid(12)}`
- Stores: `store_`
- Sessions: `sess_`
- Use nanoid with URL-safe alphabet
