# Xcode Project Setup Guide

This guide will help you create a complete Xcode project for the Boutique GEO iPad app.

## Step-by-Step Setup

### 1. Create New Xcode Project

1. Open Xcode
2. Select **File → New → Project** (⌘⇧N)
3. Choose **iOS → App**
4. Click **Next**

### 2. Configure Project Settings

Fill in the project details:

- **Product Name:** `BoutiqueGEO`
- **Team:** Select your development team
- **Organization Identifier:** `com.boutiquegeo` (or your company identifier)
- **Bundle Identifier:** Will auto-generate as `com.boutiquegeo.BoutiqueGEO`
- **Interface:** **SwiftUI** (IMPORTANT)
- **Language:** **Swift**
- **Storage:** None
- **Devices:** **iPad** (IMPORTANT - deselect iPhone)

Uncheck:
- [ ] Use Core Data
- [ ] Include Tests

Click **Next** and save to: `/Users/lukedavis/Desktop/boutique-geo-v1/ipad-app/`

### 3. Clean Up Default Files

Xcode creates some default files we don't need:

1. In the Project Navigator, select `ContentView.swift`
2. Press **Delete** → **Move to Trash**
3. Close `BoutiqueGEOApp.swift` (we'll replace it)

### 4. Add Source Files

#### Option A: Drag and Drop (Recommended)

1. In Finder, navigate to `/Users/lukedavis/Desktop/boutique-geo-v1/ipad-app/BoutiqueGEO/`
2. Select all folders (App, Core, Features, UI)
3. Drag them into Xcode's Project Navigator under the "BoutiqueGEO" group
4. In the dialog that appears:
   - ✅ Check "Copy items if needed"
   - ✅ Check "Create groups"
   - ✅ Check "BoutiqueGEO" target
5. Click **Finish**

#### Option B: Add Files Manually

1. Right-click "BoutiqueGEO" group in Project Navigator
2. Select **Add Files to "BoutiqueGEO"...**
3. Navigate to `/Users/lukedavis/Desktop/boutique-geo-v1/ipad-app/BoutiqueGEO/`
4. Select all folders
5. Check "Copy items if needed" and "Create groups"
6. Click **Add**

### 5. Configure Info.plist

#### Option A: Replace with Custom Info.plist

1. In Project Navigator, select `Info.plist`
2. Delete it
3. Drag `/Users/lukedavis/Desktop/boutique-geo-v1/ipad-app/BoutiqueGEO/Info.plist` into the project
4. Ensure it's added to the BoutiqueGEO target

#### Option B: Configure Manually

1. Select project in Project Navigator
2. Select "BoutiqueGEO" target
3. Go to **Info** tab
4. Add these keys:

**Supported interface orientations (iPad):**
- Landscape Left
- Landscape Right
- Portrait (optional)

**App Transport Security Settings:**
- Right-click, **Add Row**
- Key: `App Transport Security Settings` (Dictionary)
- Add child: `Allow Arbitrary Loads` (Boolean) = YES

**Status Bar:**
- Add Row: `Status bar is initially hidden` (Boolean) = YES

**Full Screen:**
- Add Row: `Requires full screen` (Boolean) = YES

### 6. Configure Project Settings

Select your project → "BoutiqueGEO" target:

#### General Tab

**Identity:**
- Display Name: `Boutique GEO`
- Bundle Identifier: `com.boutiquegeo.BoutiqueGEO`
- Version: `1.0.0`
- Build: `1`

**Deployment Info:**
- Minimum Deployments: **iOS 17.0**
- Supported Destinations: **iPad** only
- Requires Full Screen: **Yes**
- Status Bar Style: Default
- Hide Status Bar: **Yes**

**Supported Destinations:**
- Ensure only iPad is checked

#### Signing & Capabilities Tab

- Automatically manage signing: ✅
- Team: Select your team
- Bundle Identifier: Verify it matches

### 7. Verify File Structure

Your project structure should look like this:

```
BoutiqueGEO (Xcode Project)
└── BoutiqueGEO/
    ├── App/
    │   └── BoutiqueGEOApp.swift
    ├── Core/
    │   ├── Config.swift
    │   ├── Models.swift
    │   ├── APIClient.swift
    │   └── AppState.swift
    ├── Features/
    │   ├── Pairing/
    │   │   ├── PairingView.swift
    │   │   └── PairingViewModel.swift
    │   ├── Idle/
    │   │   ├── IdleView.swift
    │   │   └── IdleViewModel.swift
    │   ├── Rating/
    │   │   ├── RatingView.swift
    │   │   └── RatingViewModel.swift
    │   ├── Consent/
    │   │   ├── ConsentView.swift
    │   │   └── ConsentViewModel.swift
    │   ├── Handoff/
    │   │   ├── HandoffView.swift
    │   │   └── HandoffViewModel.swift
    │   └── ThankYou/
    │       └── ThankYouView.swift
    ├── UI/
    │   ├── Components/
    │   │   ├── PrimaryButton.swift
    │   │   ├── StarRatingView.swift
    │   │   └── QRCodeView.swift
    │   └── Theme/
    │       ├── Colors.swift
    │       ├── Typography.swift
    │       └── Spacing.swift
    ├── Assets.xcassets/
    └── Info.plist
```

### 8. Configure Backend URL

1. Open `Core/Config.swift`
2. Update the API base URL:

For **Simulator**:
```swift
static let apiBaseURL = "http://localhost:3000"
```

For **Physical iPad** (replace with your Mac's IP):
```swift
static let apiBaseURL = "http://192.168.1.XXX:3000"
```

To find your Mac's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 9. Build the Project

1. Select a destination: **iPad Pro (12.9-inch) (6th generation)** or your physical device
2. Press **⌘B** to build
3. Fix any errors (should be none if files added correctly)

### 10. Run the App

1. Press **⌘R** to run
2. App should launch and show the Pairing screen

## Testing the Complete Flow

### Prerequisites

1. Backend must be running: `cd backend && npm run dev`
2. Ensure backend is accessible from the iPad

### Test Steps

1. **Pairing**
   - Enter store public ID (e.g., `store_demo123456`)
   - Tap "Pair Device"
   - Should transition to Idle screen

2. **Trigger Session**
   - In terminal, run: `cd backend && npm run mock:webhook`
   - This creates a pending review session

3. **Idle Screen**
   - App should automatically detect the pending session within 7 seconds
   - Auto-transitions to Rating screen

4. **Rating**
   - Tap 4 or 5 stars
   - Tap "Submit Rating"
   - Should transition to Consent screen

5. **Consent**
   - Review the AI-generated text
   - Tap "Yes, Continue"
   - Should transition to Handoff screen

6. **Handoff**
   - QR code should be displayed
   - Scan with phone (or wait 30 seconds for timeout)
   - Tap "Done"
   - Should transition to Thank You screen

7. **Thank You**
   - Shows for 3 seconds
   - Auto-returns to Idle screen

## Troubleshooting

### Build Errors

**"Cannot find type 'X' in scope"**
- Ensure all files are added to the BoutiqueGEO target
- Check that files are in the correct folders
- Clean build folder: **⌘⇧K**

**"Failed to build module 'SwiftUI'"**
- Ensure deployment target is iOS 17.0 or later
- Restart Xcode

### Runtime Errors

**"Connection failed" on pairing**
- Verify backend is running
- Check API base URL in Config.swift
- Test backend: `curl http://localhost:3000/api/v1/health`

**App crashes on launch**
- Check console logs in Xcode
- Verify all required files are present
- Clean build folder and rebuild

**QR code not showing**
- Ensure session has valid publicId
- Check console for errors
- Verify QRCodeView is rendering correctly

### Network Issues

**Simulator can't reach backend**
- Use `http://localhost:3000` for simulator
- Check firewall settings

**Physical iPad can't reach backend**
- Ensure iPad and Mac on same WiFi network
- Use Mac's local IP address (not localhost)
- Update Config.swift with correct IP
- Test connectivity: Open Safari on iPad → `http://YOUR_IP:3000/api/v1/health`

## Kiosk Mode Setup (Production)

### Enable Guided Access

1. On iPad: **Settings → Accessibility → Guided Access**
2. Toggle **Guided Access** ON
3. Set a passcode
4. Configure options:
   - Time Limits: Off
   - Touch: Allow
   - Motion: Allow
   - Keyboards: Allow

### Lock to App

1. Open BoutiqueGEO app
2. Triple-click **Side Button** (or Home button on older iPads)
3. Tap **Options** (bottom left)
4. Disable:
   - Sleep/Wake Button
   - Volume Buttons
   - Motion
   - Keyboards (if not needed)
   - Touch (in specific areas)
5. Tap **Done**
6. Tap **Start** (top right)

App is now locked in kiosk mode. To exit:
1. Triple-click Side Button
2. Enter passcode

## Development Tips

### Enable Console Logs

View logs in Xcode:
1. Run app
2. Open **Debug Area** (⌘⇧Y)
3. Select **Console** tab
4. Filter logs with "BoutiqueGEO"

### Hot Reload (Preview)

Use SwiftUI Previews for faster development:
1. Open any View file
2. Click **Resume** in preview canvas (⌥⌘P)
3. Edit code and see changes instantly

### Network Debugging

Add to `APIClient.swift` for debugging:
```swift
print("Request URL: \(url)")
print("Response: \(String(data: data, encoding: .utf8) ?? "")")
```

### Common Xcode Shortcuts

- **⌘B**: Build
- **⌘R**: Build and Run
- **⌘.**: Stop Running
- **⌘⇧K**: Clean Build Folder
- **⌘⇧Y**: Show/Hide Debug Area
- **⌘⌥⏎**: Show Preview Canvas

## Additional Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [iPad App Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/ipad)
- [App Store Distribution Guide](https://developer.apple.com/help/app-store-connect/)

## Next Steps

1. Add app icon (Assets.xcassets → AppIcon)
2. Test on physical iPad
3. Configure production API URL
4. Enable HTTPS (remove NSAllowsArbitraryLoads)
5. Add analytics/monitoring (if needed)
6. Prepare for App Store distribution

## Support

For backend issues, see: `/backend/README.md`
For API documentation, see: `/SPEC.md`
