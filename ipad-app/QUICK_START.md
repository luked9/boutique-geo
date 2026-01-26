# Boutique GEO iPad App - Quick Start Checklist

Get the iPad app running in 10 minutes.

## Prerequisites

- [ ] Xcode 15+ installed
- [ ] Backend running at `http://localhost:3000`
- [ ] Test store created in backend
- [ ] iPad simulator or device ready

## Setup Steps

### 1. Create Xcode Project (2 minutes)

```bash
# Open Xcode
# File → New → Project
# iOS → App
```

**Settings:**
- Product Name: `BoutiqueGEO`
- Interface: **SwiftUI**
- Language: **Swift**
- Devices: **iPad** only
- Uncheck: Core Data, Tests

**Save to:** `/Users/lukedavis/Desktop/boutique-geo-v1/ipad-app/`

### 2. Add Source Files (1 minute)

```bash
# In Xcode Project Navigator:
# 1. Delete ContentView.swift
# 2. Drag these folders into project:
#    - App/
#    - Core/
#    - Features/
#    - UI/
# 3. Check "Copy items if needed"
# 4. Check "Create groups"
# 5. Select BoutiqueGEO target
```

### 3. Configure Project (2 minutes)

**Project Settings → General:**
- Deployment Target: iOS 17.0
- Devices: iPad only

**Project Settings → Info:**
Add these keys:
- App Transport Security Settings → Allow Arbitrary Loads = YES
- Status bar is initially hidden = YES
- Requires full screen = YES

**Or:** Replace Info.plist with provided one:
```bash
# Delete existing Info.plist
# Drag BoutiqueGEO/Info.plist into project
```

### 4. Update API URL (1 minute)

Edit `Core/Config.swift`:

```swift
// For Simulator:
static let apiBaseURL = "http://localhost:3000"

// For Physical iPad:
static let apiBaseURL = "http://YOUR_MAC_IP:3000"
```

Find your Mac's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 5. Build & Run (1 minute)

```bash
# In Xcode:
# 1. Select iPad Pro simulator (or your device)
# 2. Press ⌘B to build
# 3. Press ⌘R to run
```

**Expected:** App launches, shows Pairing screen.

### 6. Test Pairing (1 minute)

In the app:
1. Enter store ID (e.g., `store_demo123456`)
2. Tap "Pair Device"
3. Should transition to Idle screen

**If error:** Check backend is running and store ID exists.

### 7. Test Complete Flow (2 minutes)

**Create test session:**
```bash
cd /Users/lukedavis/Desktop/boutique-geo-v1/backend
npm run mock:webhook
```

**Watch the app:**
1. Idle screen should auto-detect session (within 7s)
2. Navigate to Rating screen
3. Tap 4 or 5 stars
4. Tap "Submit Rating"
5. Review appears on Consent screen
6. Tap "Yes, Continue"
7. QR code appears on Handoff screen
8. Scan with phone OR wait 30s OR tap "Done"
9. Thank You screen shows for 3s
10. Returns to Idle screen

**Success!** The app is working end-to-end.

## Quick Reference

### File Structure
```
BoutiqueGEO/
├── App/
│   └── BoutiqueGEOApp.swift        # Entry point
├── Core/
│   ├── Config.swift                 # API URL here
│   ├── Models.swift                 # Data models
│   ├── APIClient.swift              # Network layer
│   └── AppState.swift               # State management
├── Features/
│   ├── Pairing/                     # Store ID input
│   ├── Idle/                        # Polling screen
│   ├── Rating/                      # Star rating
│   ├── Consent/                     # Review approval
│   ├── Handoff/                     # QR code
│   └── ThankYou/                    # Thank you
└── UI/
    ├── Components/                  # Buttons, stars, QR
    └── Theme/                       # Colors, fonts
```

### Screen Flow
```
Pairing → Idle → Rating → Consent → Handoff → ThankYou → Idle
                              ↓
                          ThankYou
```

### API Endpoints
```
GET  /api/v1/kiosk/{storeId}/next
POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/rating
POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/approve
POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/decline
POST /api/v1/review/{sessionId}/done
```

### Key Features
- Polls every 7 seconds for pending sessions
- 30-second timeout on Handoff screen
- 3-second Thank You screen
- Long-press logo for settings (re-pair)
- Store ID persisted in UserDefaults

## Troubleshooting

### "Cannot find type in scope"
```bash
# Clean build folder
⌘⇧K

# Rebuild
⌘B
```

### "Connection failed" on pairing
```bash
# Check backend is running
curl http://localhost:3000/api/v1/health

# Should return:
# { "ok": true, "version": "1.0.0", "time": "..." }
```

### App doesn't detect session
```bash
# Create test session
cd backend
npm run mock:webhook

# Wait up to 7 seconds for polling cycle
# Or tap screen to force check
```

### QR code not showing
- Check console for errors
- Verify session has valid publicId
- Check Config.Endpoints.reviewURL()

### Physical iPad can't reach backend
```bash
# 1. Get your Mac's IP
ifconfig | grep "inet "

# 2. Update Config.swift
static let apiBaseURL = "http://192.168.1.XXX:3000"

# 3. Test from iPad Safari
# Navigate to: http://YOUR_IP:3000/api/v1/health

# 4. Rebuild app
⌘B
⌘R
```

## Common Commands

### Xcode Shortcuts
```
⌘B          Build
⌘R          Run
⌘.          Stop
⌘⇧K         Clean build folder
⌘⇧Y         Show/hide console
⌥⌘⏎         Show preview
```

### Backend Commands
```bash
cd backend
npm run dev              # Start server
npm run mock:webhook     # Create test session
npm run prisma:studio    # View database
```

### Reset App State
```bash
# Delete app from simulator/device
# Or long-press logo → Re-pair Device
```

## Next Steps

- [x] App running locally
- [ ] Test on physical iPad
- [ ] Update API URL for production
- [ ] Add app icon
- [ ] Enable Guided Access (kiosk mode)
- [ ] Test with real Square webhooks
- [ ] Deploy backend to production
- [ ] Configure HTTPS
- [ ] Submit to App Store

## Resources

- **Full Setup:** See `XCODE_SETUP.md`
- **App Flow:** See `APP_FLOW.md`
- **File Details:** See `FILE_MANIFEST.md`
- **Backend Spec:** See `/SPEC.md`
- **Backend Setup:** See `/backend/README.md`

## Support

**Backend not running?**
```bash
cd backend
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

**Need to create a store?**
```bash
cd backend
npm run seed
# Creates demo store with ID: store_demo123456
```

**Xcode won't build?**
1. Check all files are added to target
2. Clean build folder (⌘⇧K)
3. Quit and reopen Xcode
4. Check minimum deployment target is iOS 17.0

**Still stuck?**
1. Check console logs in Xcode
2. Check backend logs
3. Verify network connectivity
4. Try simulator vs physical device

---

**You're all set!** The app should be running and ready to test.
