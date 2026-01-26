# Boutique GEO iPad App

SwiftUI iPad application for the Boutique GEO review kiosk.

## Requirements

- Xcode 15+
- iPadOS 17+
- iPad device or simulator

## Quick Start

1. Open `BoutiqueGEO.xcodeproj` in Xcode
2. Select your target device (iPad)
3. Update the API base URL in `Core/Config.swift` if needed
4. Build and Run (⌘R)

## First Launch

1. App shows pairing screen
2. Enter your Store Public ID (e.g., `store_demo123456`)
3. Tap "Connect"
4. App transitions to Idle screen

## Screen Flow

```
Pairing → Idle → Rating → Consent → Handoff → ThankYou → Idle
                            ↓ (decline)
                            └──────────────────────────────────┘
```

### Screens

| Screen | Description |
|--------|-------------|
| **Pairing** | Enter store public ID (first launch only) |
| **Idle** | Attract screen, polls for pending sessions |
| **Rating** | 5 large tappable stars for customer rating |
| **Consent** | Shows AI-generated review, Yes/No buttons |
| **Handoff** | QR code for customer to scan |
| **ThankYou** | Brief thank you message (2-3 seconds) |

## Project Structure

```
BoutiqueGEO/
├── App/
│   └── BoutiqueGEOApp.swift    # App entry point
├── Core/
│   ├── Config.swift             # API configuration
│   ├── Models.swift             # Data models
│   ├── APIClient.swift          # Network layer
│   └── AppState.swift           # App state management
├── Features/
│   ├── Pairing/                 # Pairing screen
│   ├── Idle/                    # Idle/attract screen
│   ├── Rating/                  # Star rating screen
│   ├── Consent/                 # Review consent screen
│   ├── Handoff/                 # QR code handoff screen
│   └── ThankYou/                # Thank you screen
└── UI/
    ├── Components/              # Reusable UI components
    └── Theme/                   # Colors, typography, spacing
```

## Configuration

Edit `Core/Config.swift` to change:

```swift
struct Config {
    static let apiBaseURL = "http://localhost:3000"  // Your backend URL
    static let pollingInterval: TimeInterval = 5.0   // Session polling interval
    static let handoffTimeout: TimeInterval = 30.0   // Handoff screen timeout
}
```

## Kiosk Mode (Guided Access)

For production deployment:

1. Go to **Settings → Accessibility → Guided Access**
2. Turn on Guided Access
3. Set a passcode
4. Open BoutiqueGEO app
5. Triple-click Home/Side button
6. Tap "Start"

This locks the iPad to the app.

## Hidden Settings

To re-pair with a different store:

1. On the Idle screen
2. Long-press the logo (3 seconds)
3. Settings panel appears
4. Enter new Store Public ID

## Manual QA Checklist

### Pairing Flow
- [ ] App shows pairing screen on first launch
- [ ] Can enter store public ID
- [ ] "Connect" button validates input
- [ ] Store ID is persisted after app restart
- [ ] Invalid store ID shows error message

### Idle Screen
- [ ] Shows store name
- [ ] "Tap to Start" or auto-transitions when session pending
- [ ] Polls for sessions every 5-10 seconds
- [ ] Long-press logo opens settings

### Rating Screen
- [ ] Shows 5 large stars
- [ ] Stars are tappable
- [ ] Selected stars fill in
- [ ] Submit sends rating to API
- [ ] Error handling for network failures

### Consent Screen
- [ ] Shows generated review text
- [ ] "Yes" button approves and goes to Handoff
- [ ] "No" button declines and returns to Idle
- [ ] Review text is readable

### Handoff Screen
- [ ] QR code is displayed
- [ ] QR code is scannable
- [ ] URL is correct (/r/{sessionId})
- [ ] "Done" button works
- [ ] Auto-resets after 30 seconds

### Thank You Screen
- [ ] Shows briefly (2-3 seconds)
- [ ] Auto-transitions to Idle

### Error Handling
- [ ] Network errors show friendly message
- [ ] Retry button works
- [ ] App recovers gracefully
- [ ] No crashes

## Troubleshooting

### App won't connect
- Check backend is running
- Verify API base URL in Config.swift
- Check network connectivity
- Confirm store public ID is correct

### QR code not scanning
- Ensure URL is correct
- Test with different QR scanner app
- Verify backend landing page is accessible

### Session not appearing
- Run `npm run mock:webhook` in backend
- Check backend logs for errors
- Verify store ID matches

## Development Notes

- Uses `@StateObject` and `@EnvironmentObject` for state
- All network calls are async/await
- QR codes generated with CoreImage (CIFilter)
- Supports landscape orientation
- Pure white background for visibility
