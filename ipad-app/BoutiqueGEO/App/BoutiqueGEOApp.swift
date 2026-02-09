import SwiftUI

@main
struct BoutiqueGEOApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.light)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var showExitConfirmation = false

    var body: some View {
        ZStack {
            Color.background
                .ignoresSafeArea()

            Group {
                switch appState.currentScreen {
                case .pairing:
                    PairingView()
                case .idle:
                    IdleView()
                case .rating:
                    RatingView()
                case .consent:
                    ConsentView()
                case .handoff:
                    HandoffView()
                case .thankYou:
                    ThankYouView()
                }
            }
            .transition(.opacity)

            // Exit session button (top-right, subtle)
            if appState.currentScreen != .pairing {
                VStack {
                    HStack {
                        Spacer()
                        Button("Exit Session") {
                            showExitConfirmation = true
                        }
                        .font(.system(size: 12))
                        .foregroundColor(Color.gray.opacity(0.4))
                        .padding(.trailing, 20)
                        .padding(.top, 12)
                    }
                    Spacer()
                }
            }
        }
        .onAppear {
            appState.initialize()
        }
        .alert("Exit Session?", isPresented: $showExitConfirmation) {
            Button("Yes, Exit", role: .destructive) {
                appState.storePublicId = nil
                appState.resetSessionData()
                appState.navigateToPairing()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will disconnect from the current store and return to the pairing screen.")
        }
    }
}
