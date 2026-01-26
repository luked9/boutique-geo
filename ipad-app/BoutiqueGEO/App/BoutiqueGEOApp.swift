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
        }
        .onAppear {
            appState.initialize()
        }
    }
}
