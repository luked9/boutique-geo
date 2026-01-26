# Boutique GEO — External Setup Guide

This guide covers all external service setup required before running Boutique GEO.

---

## 1. Square Developer Account Setup

### 1.1 Create Square Developer Account
1. Go to https://developer.squareup.com/
2. Click "Get Started" and sign in with your Square account (or create one)
3. Accept the Developer Agreement

### 1.2 Create an Application
1. Navigate to https://developer.squareup.com/apps
2. Click "+ New Application"
3. Enter application name: "Boutique GEO"
4. Click "Save"

### 1.3 Configure OAuth
1. Open your application
2. Go to "OAuth" tab
3. Add Redirect URL:
   - Development: `http://localhost:3000/api/v1/square/oauth/callback`
   - Production: `https://your-domain.com/api/v1/square/oauth/callback`
4. Note down:
   - **Application ID** → `SQUARE_APP_ID`
   - **Application Secret** → `SQUARE_APP_SECRET`

### 1.4 Configure OAuth Scopes
Request these OAuth permissions:
- `ORDERS_READ` — Read order information
- `PAYMENTS_READ` — Read payment information
- `MERCHANT_PROFILE_READ` — Read merchant profile

### 1.5 Set Up Webhooks
1. Go to "Webhooks" tab
2. Click "Add Webhook"
3. Enter endpoint URL:
   - Development: Use ngrok or similar tunnel (see section 5)
   - Production: `https://your-domain.com/api/v1/square/webhook`
4. Subscribe to events:
   - `payment.completed`
   - `order.updated`
5. Note down **Signature Key** → `SQUARE_WEBHOOK_SIGNATURE_KEY`

### 1.6 Sandbox vs Production
- Set `SQUARE_ENV=sandbox` for testing with fake data
- Set `SQUARE_ENV=production` for real transactions
- Use sandbox during development!

---

## 2. Google Business Profile Setup

### 2.1 Get Your Review Link
Each store needs their Google review URL for customers to post reviews.

**Option A: Via Google Maps**
1. Go to https://www.google.com/maps
2. Search for your business
3. Click on your business listing
4. Click "Write a review"
5. Copy the URL from the address bar

**Option B: Via Google Business Profile**
1. Go to https://business.google.com/
2. Select your location
3. Click "Get more reviews"
4. Copy the short link provided

**Option C: Construct the URL**
1. Find your Place ID at https://developers.google.com/maps/documentation/places/web-service/place-id
2. Construct: `https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID`

### 2.2 Store the URL
When creating a store in Boutique GEO, paste this URL as the `reviewDestinationUrl`.

---

## 3. OpenAI API Setup (for AI Review Generation)

### 3.1 Get API Key
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys
4. Click "Create new secret key"
5. Copy the key → `AI_API_KEY`

### 3.2 Configure Model
Default model is `gpt-4o-mini`. To change:
- Set `AI_MODEL=gpt-4o` for higher quality
- Set `AI_MODEL=gpt-3.5-turbo` for lower cost

### 3.3 Alternative Providers
Boutique GEO supports any OpenAI-compatible API:
- Set `AI_API_BASE_URL` to your provider's endpoint
- Set `AI_API_KEY` to your provider's key
- Set `AI_MODEL` to your provider's model name

---

## 4. NFC Tag Setup

### 4.1 Purchase NFC Tags
Recommended tags:
- **NTAG213** — 144 bytes, sufficient for short URLs
- **NTAG215** — 504 bytes, more headroom
- **NTAG216** — 888 bytes, maximum capacity

Purchase from:
- Amazon (search "NTAG215 NFC stickers")
- NFCTagify.com
- GoToTags.com

### 4.2 Program NFC Tags
You need an NFC-capable phone to program tags.

**Using iPhone:**
1. Download "NFC Tools" from App Store
2. Open the app
3. Tap "Write"
4. Tap "Add a record"
5. Select "URL/URI"
6. Enter: `https://your-domain.com/tap/{storePublicId}`
7. Tap "Write"
8. Hold phone near NFC tag until confirmed

**Using Android:**
1. Download "NFC Tools" from Play Store
2. Follow same steps as iPhone

### 4.3 Tag Placement
- Embed tag in the kiosk stand (hidden)
- Place at customer-reachable height
- Test read distance (typically 1-4 cm)
- Consider adding a small "Tap here" icon

### 4.4 URL Strategy
Since passive NFC tags cannot change their URL:
- Program with store-level URL: `/tap/{storePublicId}`
- This shows the most recent approved review
- QR code (on iPad) shows session-specific URL as backup

---

## 5. Local Development Tunnel (for Webhooks)

Square webhooks require a public URL. For local development:

### 5.1 Using ngrok
1. Sign up at https://ngrok.com/
2. Download and install ngrok
3. Authenticate: `ngrok config add-authtoken YOUR_TOKEN`
4. Start tunnel: `ngrok http 3000`
5. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
6. Update Square webhook URL to: `https://abc123.ngrok.io/api/v1/square/webhook`

### 5.2 Using Cloudflare Tunnel
1. Install cloudflared: `brew install cloudflared`
2. Run: `cloudflared tunnel --url http://localhost:3000`
3. Use the provided URL for webhooks

**Note:** Free ngrok URLs change each restart. For persistent development, use ngrok's paid plan or Cloudflare Tunnels.

---

## 6. iPad Hardware Setup

### 6.1 Requirements
- iPad (any model with iPadOS 17+)
- iPad stand (with NFC tag holder)
- Power cable and adapter
- Wi-Fi connection

### 6.2 Install the App
**Development:**
1. Open `/ipad-app/BoutiqueGEO.xcodeproj` in Xcode
2. Connect iPad via USB
3. Select your iPad as target device
4. Click Run (⌘R)
5. Trust developer certificate on iPad: Settings → General → VPN & Device Management

**Production:**
1. Archive the app in Xcode
2. Distribute via TestFlight or App Store

### 6.3 Configure the App
1. Launch BoutiqueGEO on iPad
2. Enter the Store Public ID (e.g., `store_abc123`)
3. Tap "Connect"

### 6.4 Enable Guided Access (Kiosk Mode)
1. Go to Settings → Accessibility → Guided Access
2. Turn on Guided Access
3. Set a passcode
4. Open BoutiqueGEO app
5. Triple-click the Home/Side button
6. Tap "Start" to lock the iPad to the app

### 6.5 Recommended Settings
- Disable Auto-Lock: Settings → Display & Brightness → Auto-Lock → Never
- Enable Do Not Disturb: Settings → Focus → Do Not Disturb → On
- Disable Notifications: Settings → Notifications → disable for all apps
- Set screen brightness appropriately

---

## 7. Environment Variables Reference

Create a `.env` file in `/backend/` with these values:

```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boutique_geo?schema=public

# Security
ENCRYPTION_KEY=your-32-byte-hex-key-here-64-characters

# Square
SQUARE_APP_ID=your-square-app-id
SQUARE_APP_SECRET=your-square-app-secret
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key
SQUARE_ENV=sandbox

# AI (OpenAI-compatible)
AI_API_KEY=sk-your-openai-api-key
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# App URLs (for OAuth redirects)
APP_BASE_URL=http://localhost:3000
```

### Generate Encryption Key
```bash
# Generate a 32-byte (256-bit) key
openssl rand -hex 32
```

---

## 8. Verification Checklist

Before going live, verify:

- [ ] Square Developer account created
- [ ] Square OAuth configured with correct redirect URLs
- [ ] Square webhook endpoint configured and receiving events
- [ ] Google review URL obtained for the store
- [ ] OpenAI API key obtained and tested
- [ ] NFC tags programmed with correct URLs
- [ ] iPad configured with Guided Access
- [ ] Environment variables set correctly
- [ ] Full flow tested end-to-end

---

## 9. Troubleshooting

### Square OAuth Not Working
- Verify redirect URL matches exactly (including trailing slash)
- Check SQUARE_APP_ID and SQUARE_APP_SECRET
- Ensure using correct environment (sandbox vs production)

### Webhooks Not Received
- Check ngrok/tunnel is running
- Verify webhook URL in Square dashboard
- Check signature key matches
- Look at Square webhook logs in dashboard

### NFC Tags Not Reading
- Ensure tag is programmed correctly
- Check tag is NDEF formatted
- Verify URL is valid
- Try different phone positions

### iPad App Connection Issues
- Verify backend is running
- Check network connectivity
- Confirm storePublicId is correct
- Check backend logs for errors

---

## 10. Support

For issues:
1. Check the logs: `docker-compose logs -f backend`
2. Review this setup guide
3. Consult SPEC.md for technical details
4. Open an issue in the repository
