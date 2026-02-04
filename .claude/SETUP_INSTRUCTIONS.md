# BoutiqueGEO Setup Instructions

Complete guide for onboarding a new business onto the BoutiqueGEO platform.

---

## Global Setup (One-Time)

These only need to be configured once for the entire platform.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SQUARE_APP_ID` | From Square Developer Dashboard |
| `SQUARE_APP_SECRET` | From Square Developer Dashboard |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | From Square webhook settings |
| `ENCRYPTION_KEY` | 64-character hex string (`openssl rand -hex 32`) |
| `AI_API_KEY` | OpenAI API key for review generation |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_BASE_URL` | Production URL (e.g., `https://boutique-geo-production.up.railway.app`) |

### Square Webhook Configuration

1. Go to the **Square Developer Dashboard** (your developer account)
2. Navigate to **Webhooks**
3. Set the webhook URL to: `https://boutique-geo-production.up.railway.app/api/v1/square/webhook`
4. Subscribe to the `payment.completed` event
5. Copy the **Webhook Signature Key** and set it as the `SQUARE_WEBHOOK_SIGNATURE_KEY` environment variable on your backend

This is shared across all stores. The system identifies which store a payment belongs to via the Square `location_id`.

---

## Per-Client Setup

### What You Need Per Client

| Item | Details |
|------|---------|
| iPad + stand | Physical hardware you provide |
| Store public ID | Generated via API (Step 1) |
| Square OAuth | Business owner authorizes once (Step 2) |
| Review URL | Their Google, Yelp, or Apple Maps review link |

---

### Step 1: Create the Store

Run this API call to register the new business:

```bash
curl -X POST https://boutique-geo-production.up.railway.app/api/v1/stores \
  -H "Content-Type: application/json" \
  -d '{
    "name": "The Client Store Name",
    "primaryReviewPlatform": "GOOGLE",
    "reviewDestinationUrl": "https://g.page/their-business/review"
  }'
```

**Platform options:** `GOOGLE`, `YELP`, or `APPLE_MAPS`

The response returns a **store public ID** like `store_abc123xyz789`. Save this — you need it for Square OAuth and iPad pairing.

---

### Step 2: Connect Their Square Account

Open this URL in a browser (on your laptop, not the iPad):

```
https://boutique-geo-production.up.railway.app/api/v1/square/oauth/start?storePublicId=store_abc123xyz789
```

Replace `store_abc123xyz789` with the actual store public ID from Step 1.

This redirects to Square's login page. The business owner signs into **their** Square account and authorizes the app. After approval, they are redirected back and see a "Connected to Square" confirmation page.

Behind the scenes, their access and refresh tokens are encrypted (using libsodium XSalsa20-Poly1305) and stored in the database.

**Important:** Verify that the store's `squareLocationId` is set in the database so incoming webhooks can be matched to the correct store.

---

### Step 3: Pair the iPad

1. Power on the iPad and open the BoutiqueGEO app
2. The app shows the **Pairing** screen
3. Enter the store's public ID: `store_abc123xyz789`
4. Tap **Connect**
5. The app validates the ID against the backend
6. On success, the iPad transitions to the **Idle** screen ("TAP TO BEGIN") and starts polling for new sessions every 7 seconds

The store ID is persisted locally on the iPad in UserDefaults, so it survives app restarts.

---

### Step 4: Verify Everything Works

Test without a real purchase using the mock webhook:

```bash
cd backend
npm run mock:webhook
```

This simulates a completed Square payment. The iPad should detect the pending session within seconds and show the rating screen.

You can also seed demo data:

```bash
cd backend
npm run seed
```

This creates a demo store (`store_demo123456`), sample orders, and sessions.

---

## How It Works Day-to-Day

After setup is complete, the system runs automatically:

1. **Customer pays** via Square POS at the store
2. **Square sends a webhook** (`payment.completed`) to the backend
3. **Backend creates** an Order record and a pending ReviewSession
4. **iPad detects** the new session (polls every 7 seconds, or immediately on tap)
5. **Customer taps a star rating** (1-5) on the iPad
6. **AI generates a personalized review** based on items purchased and the star rating
7. **Customer approves** the generated review
8. **iPad shows a QR code** for the customer to scan
9. **Customer scans with their phone**, copies the review text, and posts it on Google/Yelp/Apple Maps

### Session Status Flow

```
PENDING → Customer rates → APPROVED or DECLINED
APPROVED → Customer scans QR and posts → POSTED_INTENT
```

---

## API Endpoints Reference

### Store Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/stores` | Create a new store |

### Square OAuth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/square/oauth/start?storePublicId=xxx` | Start Square OAuth flow |
| `GET` | `/api/v1/square/oauth/callback` | OAuth callback (automatic) |

### Square Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/square/webhook` | Receives payment events from Square |

### iPad Kiosk Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/kiosk/{storePublicId}/next` | Poll for pending sessions |
| `POST` | `/api/v1/kiosk/{storePublicId}/sessions/{sessionId}/rating` | Submit star rating |
| `POST` | `/api/v1/kiosk/{storePublicId}/sessions/{sessionId}/approve` | Approve generated review |
| `POST` | `/api/v1/kiosk/{storePublicId}/sessions/{sessionId}/decline` | Decline review |

### Customer Landing Page

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/r/{sessionPublicId}` | QR code landing page |
| `GET` | `/tap/{storePublicId}` | NFC tap landing page |
| `POST` | `/api/v1/review/{sessionId}/copied` | Log review copied |
| `POST` | `/api/v1/review/{sessionId}/platform_clicked` | Log platform click |
| `POST` | `/api/v1/review/{sessionId}/done` | Mark as posted intent |

---

## Database Schema

### Stores

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal primary key |
| `publicId` | String | Unique ID for pairing (e.g., `store_abc123`) |
| `name` | String | Business name |
| `primaryReviewPlatform` | Enum | `GOOGLE`, `YELP`, or `APPLE_MAPS` |
| `reviewDestinationUrl` | String | Direct review link for the platform |
| `squareMerchantId` | String? | From Square OAuth |
| `squareLocationId` | String? | Which Square location |
| `accessTokenEnc` | String? | Encrypted Square access token |
| `refreshTokenEnc` | String? | Encrypted Square refresh token |
| `tokenExpiresAt` | DateTime? | Token expiration |

### Orders

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal primary key |
| `storeId` | UUID | Foreign key to Store |
| `squareOrderId` | String | Unique Square order ID |
| `totalAmount` | Int | Amount in cents |
| `currency` | String | e.g., `USD` |
| `lineItemsJson` | JSON | Array of `{name, quantity, amount}` |

### Review Sessions

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal primary key |
| `publicId` | String | Unique session ID (e.g., `sess_xyz789`) |
| `storeId` | UUID | Foreign key to Store |
| `orderId` | UUID? | Foreign key to Order |
| `status` | Enum | `PENDING`, `DECLINED`, `APPROVED`, `POSTED_INTENT` |
| `starRating` | Int? | 1-5 |
| `generatedReviewText` | String? | AI-generated review |

### Audit Events

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal primary key |
| `storeId` | UUID | Foreign key to Store |
| `reviewSessionId` | UUID? | Foreign key to ReviewSession |
| `eventType` | String | `SESSION_CREATED`, `RATING_SUBMITTED`, `APPROVED`, `DECLINED`, `COPIED`, `PLATFORM_CLICKED`, `POSTED_INTENT` |
| `payload` | JSON | Event-specific data |
