# Boutique GEO iPad App - Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP LAUNCH                                │
│                                                                   │
│  AppState.initialize()                                           │
│       │                                                           │
│       ├─ Has storePublicId in UserDefaults?                     │
│       │                                                           │
│       ├─ NO  ──────────────┐                                     │
│       │                    │                                     │
│       └─ YES               │                                     │
│           │                │                                     │
│           v                v                                     │
│      ┌─────────┐    ┌─────────────┐                             │
│      │  IDLE   │    │   PAIRING   │                             │
│      └─────────┘    └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Screen-by-Screen Flow

### 1. PAIRING SCREEN
**Entry:** First launch (no storePublicId in UserDefaults)
**Exit:** Store ID validated → Navigate to IDLE

```
┌────────────────────────────────────────┐
│         PAIRING SCREEN                 │
├────────────────────────────────────────┤
│                                        │
│      "Boutique GEO"                    │
│      Kiosk Setup                       │
│                                        │
│   Enter Store ID:                      │
│   ┌────────────────────────┐          │
│   │ store_abc123           │          │
│   └────────────────────────┘          │
│                                        │
│   ┌────────────────────────┐          │
│   │    Pair Device         │ ◄─ Tap  │
│   └────────────────────────┘          │
│                                        │
│   [Error message if any]               │
│                                        │
└────────────────────────────────────────┘
         │
         │ On Success: API validates store ID
         │             Saves to UserDefaults
         │             AppState.storePublicId = id
         v
    Navigate to IDLE
```

**ViewModel Logic:**
```swift
func pair(appState: AppState) {
    1. Validate input not empty
    2. Call APIClient.getNextSession(storeId:)
    3. On success: Save to AppState & navigate
    4. On error: Show error message
}
```

---

### 2. IDLE SCREEN
**Entry:** After pairing OR from ThankYou screen (reset)
**Exit:** Pending session found → Navigate to RATING

```
┌────────────────────────────────────────┐
│          IDLE SCREEN                   │
├────────────────────────────────────────┤
│                                        │
│                                        │
│      "Boutique GEO" ◄── Long press 3s │
│                          for settings  │
│                                        │
│      "Tap to Start"                    │
│                                        │
│                                        │
│      [Loading spinner if polling]      │
│                                        │
└────────────────────────────────────────┘
         │
         │ POLLING (every 7 seconds)
         │ GET /api/v1/kiosk/{storeId}/next
         │
         ├─ session == null ──► Continue polling
         │
         └─ session.status == PENDING
                   │
                   v
            Navigate to RATING
            (with session & order data)
```

**ViewModel Logic:**
```swift
func startPolling(appState: AppState) {
    Task {
        while !cancelled {
            checkForPendingSession()
            await Task.sleep(7 seconds)
        }
    }
}

func checkForPendingSession(appState: AppState) {
    1. Call APIClient.getNextSession(storeId:)
    2. If session.status == PENDING:
       - Stop polling
       - Navigate to RATING with session & order
}
```

**Hidden Feature:**
```
Long Press Logo (3s)
       ↓
┌────────────────┐
│ Settings Alert │
│                │
│ Store ID: xxx  │
│                │
│ [Re-pair]      │
│ [Cancel]       │
└────────────────┘
       ↓ Re-pair
Navigate to PAIRING
(clears storePublicId)
```

---

### 3. RATING SCREEN
**Entry:** From IDLE (session found)
**Exit:** Rating submitted → Navigate to CONSENT

```
┌────────────────────────────────────────┐
│         RATING SCREEN                  │
├────────────────────────────────────────┤
│                                        │
│    "Rate Your Experience"              │
│                                        │
│    Total: $45.99                       │
│                                        │
│    ★ ★ ★ ★ ★                          │
│    └─ Tap to select (1-5)             │
│                                        │
│   ┌────────────────────────┐          │
│   │  Submit Rating         │ ◄─ Tap  │
│   └────────────────────────┘          │
│   (disabled until rating > 0)          │
│                                        │
│         [Cancel]                       │
│                                        │
└────────────────────────────────────────┘
         │
         │ User taps 4 stars
         │ User taps Submit
         │
         v
    POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/rating
    Body: { starRating: 4 }
         │
         v
    Response: { generatedReviewText: "..." }
         │
         v
    Navigate to CONSENT
    (with generated review)
```

**ViewModel Logic:**
```swift
func submitRating(appState: AppState) {
    1. Validate selectedRating > 0
    2. POST to APIClient.submitRating(storeId:sessionId:rating:)
    3. Backend generates AI review
    4. On success: Navigate to CONSENT with review text
    5. On error: Show error message
}
```

**Cancel Button:**
```
Tap Cancel ──► AppState.resetToIdle() ──► Navigate to IDLE
```

---

### 4. CONSENT SCREEN
**Entry:** From RATING (review generated)
**Exit:** Approve → HANDOFF OR Decline → THANK YOU

```
┌────────────────────────────────────────┐
│        CONSENT SCREEN                  │
├────────────────────────────────────────┤
│                                        │
│      "Your Review"                     │
│                                        │
│  We've prepared this review            │
│  based on your purchase                │
│                                        │
│  ┌──────────────────────────────┐    │
│  │ "Great experience! The       │    │
│  │ handmade scarf is beautiful  │    │
│  │ and high quality. Highly     │    │
│  │ recommend this boutique."    │    │
│  └──────────────────────────────┘    │
│        (scrollable if long)           │
│                                        │
│  ┌────────────┐  ┌───────────────┐   │
│  │ No Thanks  │  │ Yes, Continue │   │
│  └────────────┘  └───────────────┘   │
│                                        │
└────────────────────────────────────────┘
         │                    │
         │ Decline            │ Approve
         v                    v
    POST /decline        POST /approve
         │                    │
         v                    v
   Navigate to          Navigate to
    THANK YOU              HANDOFF
```

**ViewModel Logic:**
```swift
func approve(appState: AppState) {
    1. POST to APIClient.approveSession(storeId:sessionId:)
    2. Backend updates session.status = APPROVED
    3. Backend updates store.lastApprovedSessionId
    4. On success: Navigate to HANDOFF
    5. On error: Show error message
}

func decline(appState: AppState) {
    1. POST to APIClient.declineSession(storeId:sessionId:)
    2. Backend updates session.status = DECLINED
    3. On success: Navigate to THANK YOU
    4. On error: Show error message
}
```

---

### 5. HANDOFF SCREEN
**Entry:** From CONSENT (approved)
**Exit:** Done clicked OR 30s timeout → Navigate to THANK YOU

```
┌────────────────────────────────────────┐
│        HANDOFF SCREEN                  │
├────────────────────────────────────────┤
│                                        │
│  "Scan to Post Your Review"            │
│                                        │
│  Use your phone's camera               │
│  to scan the QR code                   │
│                                        │
│      ┌─────────────────┐              │
│      │                 │              │
│      │   QR CODE       │              │
│      │   400x400       │              │
│      │                 │              │
│      └─────────────────┘              │
│   URL: /r/{sessionPublicId}           │
│                                        │
│   Time remaining: 27s                  │
│                                        │
│   ┌────────────────────────┐          │
│   │       Done             │          │
│   └────────────────────────┘          │
│                                        │
└────────────────────────────────────────┘
         │
         │ Two exit paths:
         │
         ├─ User taps Done
         │       │
         │       v
         │  POST /api/v1/review/{sessionId}/done
         │       │
         │       v
         │  Navigate to THANK YOU
         │
         └─ Timer hits 0 (30 seconds)
                 │
                 v
            POST /done
                 │
                 v
            Navigate to THANK YOU
```

**ViewModel Logic:**
```swift
func startTimeout(appState: AppState) {
    Task {
        for i in 30...0 {
            remainingSeconds = i
            await Task.sleep(1 second)

            if i == 0 {
                markDone(appState)
            }
        }
    }
}

func markDone(appState: AppState) {
    1. Cancel timeout task
    2. POST to APIClient.markSessionDone(sessionId:)
    3. Backend updates session.status = POSTED_INTENT
    4. On success OR error: Navigate to THANK YOU
       (graceful handling - still advance even on error)
}
```

**QR Code Content:**
```
URL: {Config.apiBaseURL}/r/{sessionPublicId}
Example: http://localhost:3000/r/sess_xyz789

Customer scans → Opens mobile landing page
Landing page shows review + Copy + Post buttons
(Handled by separate mobile web component)
```

---

### 6. THANK YOU SCREEN
**Entry:** From CONSENT (declined) OR HANDOFF (completed)
**Exit:** Auto-reset after 3 seconds → Navigate to IDLE

```
┌────────────────────────────────────────┐
│       THANK YOU SCREEN                 │
├────────────────────────────────────────┤
│                                        │
│                                        │
│                                        │
│       "Thank You!"                     │
│                                        │
│   We appreciate your feedback          │
│                                        │
│                                        │
│                                        │
│                                        │
└────────────────────────────────────────┘
         │
         │ Automatically after 3 seconds
         │
         v
    AppState.resetToIdle()
         │
         v
    Navigate to IDLE
    (clears session data, ready for next customer)
```

**View Logic:**
```swift
.onAppear {
    Task {
        await Task.sleep(3 seconds)
        appState.resetToIdle()
    }
}
```

---

## Complete Flow Summary

### Happy Path (Customer Posts Review)
```
PAIRING
   ↓ (enter store ID)
IDLE
   ↓ (pending session detected)
RATING
   ↓ (submit 4-5 stars)
CONSENT
   ↓ (approve review)
HANDOFF
   ↓ (scan QR or timeout)
THANK YOU
   ↓ (3 second delay)
IDLE
   ↓ (ready for next customer)
```

### Decline Path (Customer Declines Review)
```
PAIRING
   ↓
IDLE
   ↓
RATING
   ↓
CONSENT
   ↓ (decline review)
THANK YOU
   ↓
IDLE
```

### Cancel Path (Customer Cancels Mid-Flow)
```
PAIRING
   ↓
IDLE
   ↓
RATING
   ↓ (tap Cancel button)
IDLE
```

### Re-pair Path (Change Store ID)
```
IDLE
   ↓ (long-press logo 3 seconds)
Settings Alert
   ↓ (tap Re-pair Device)
PAIRING
   ↓ (enter new store ID)
IDLE
```

## State Transitions

### AppState.currentScreen Values
```swift
enum Screen {
    case pairing    // Entry point if no store ID
    case idle       // Main attract screen
    case rating     // Star rating input
    case consent    // Review approval
    case handoff    // QR code display
    case thankYou   // Brief thank you
}
```

### Navigation Methods
```swift
// Called by ViewModels to change screens
appState.navigateToPairing()
appState.navigateToIdle()
appState.navigateToRating(session:order:)
appState.navigateToConsent(review:)
appState.navigateToHandoff()
appState.navigateToThankYou()
appState.resetToIdle() // Clears session data
```

## API Call Sequence

### Complete Review Session Flow
```
1. PAIRING:
   GET /api/v1/kiosk/{storeId}/next
   Response: { session: null, order: null }
   Purpose: Validate store ID exists

2. IDLE (polling):
   GET /api/v1/kiosk/{storeId}/next (every 7s)
   Response: { session: null, order: null }
   → Keep polling until session appears

3. BACKEND EVENT (Square webhook):
   Customer completes purchase
   → Backend creates review_session with status=PENDING
   → Backend associates order data

4. IDLE (polling):
   GET /api/v1/kiosk/{storeId}/next
   Response: {
     session: { publicId: "sess_xyz", status: "PENDING", ... },
     order: { totalAmount: 4599, items: [...] }
   }
   → Navigate to RATING

5. RATING:
   POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/rating
   Body: { starRating: 4 }
   Response: { generatedReviewText: "Great experience..." }
   → Navigate to CONSENT

6A. CONSENT (Approve):
    POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/approve
    Response: { ok: true }
    → Backend sets session.status = APPROVED
    → Backend updates store.lastApprovedSessionId
    → Navigate to HANDOFF

6B. CONSENT (Decline):
    POST /api/v1/kiosk/{storeId}/sessions/{sessionId}/decline
    Response: { ok: true }
    → Backend sets session.status = DECLINED
    → Navigate to THANK YOU

7. HANDOFF:
   POST /api/v1/review/{sessionId}/done
   Response: { ok: true }
   → Backend sets session.status = POSTED_INTENT
   → Navigate to THANK YOU

8. THANK YOU:
   (No API calls)
   → Auto-reset after 3s
   → Navigate to IDLE
   → Ready for next session
```

## Error Handling Paths

### Network Error During Pairing
```
PAIRING
   ↓ API call fails
Show error message
   ↓ User taps Retry
Try again
```

### Network Error During Rating
```
RATING
   ↓ API call fails
Show error message
   ↓ User can:
   ├─ Tap Submit again (retry)
   └─ Tap Cancel (return to IDLE)
```

### Network Error During Consent
```
CONSENT
   ↓ API call fails
Show error message
   ↓ User can:
   ├─ Tap Yes/No again (retry)
   └─ Wait (stay on screen)
```

### Network Error During Handoff
```
HANDOFF
   ↓ Done API call fails
Still navigate to THANK YOU
(graceful degradation - don't block user)
```

### Backend Down During Polling
```
IDLE (polling)
   ↓ API call fails
Show error message
   ↓ Continue polling
Next poll attempt (7s later)
```

## Timing Specifications

| Screen      | Duration         | Trigger              |
|-------------|------------------|----------------------|
| Pairing     | Until submitted  | User input           |
| Idle        | Indefinite       | Polling loop         |
| Rating      | Until submitted  | User input           |
| Consent     | Until submitted  | User input           |
| Handoff     | 30 seconds max   | Auto-timeout         |
| Thank You   | 3 seconds        | Auto-reset           |

## Data Flow

### AppState Published Properties
```swift
@Published var currentScreen: Screen
@Published var storePublicId: String?           // Persisted
@Published var currentSession: ReviewSession?   // Cleared on reset
@Published var currentOrder: Order?             // Cleared on reset
@Published var generatedReview: String?         // Cleared on reset
@Published var errorMessage: String?            // Cleared on reset
```

### Data Lifecycle
```
IDLE (polling)
   → AppState.currentSession = session from API
   → AppState.currentOrder = order from API

RATING
   → Uses currentSession & currentOrder
   → Creates generatedReview from API

CONSENT
   → Uses generatedReview
   → Uses currentSession for approve/decline

HANDOFF
   → Uses currentSession.publicId for QR code URL

THANK YOU
   → No data used

Reset to IDLE
   → AppState.resetSessionData()
   → Clears: currentSession, currentOrder, generatedReview, errorMessage
   → Keeps: storePublicId (persisted)
```

This completes the comprehensive flow documentation for the Boutique GEO iPad app.
