import Foundation
import SwiftUI

@MainActor
class HandoffViewModel: ObservableObject {
    @Published var remainingSeconds: Int = Int(Config.handoffTimeout)
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var timeoutTask: Task<Void, Never>?

    func startTimeout(appState: AppState) {
        remainingSeconds = Int(Config.handoffTimeout)

        timeoutTask = Task {
            for _ in 0..<Int(Config.handoffTimeout) {
                try? await Task.sleep(nanoseconds: 1_000_000_000)

                if Task.isCancelled {
                    return
                }

                remainingSeconds -= 1

                if remainingSeconds <= 0 {
                    await markDone(appState: appState)
                    return
                }
            }
        }
    }

    func stopTimeout() {
        timeoutTask?.cancel()
        timeoutTask = nil
    }

    func markDone(appState: AppState) {
        guard !isLoading else { return }
        guard let session = appState.currentSession else { return }

        stopTimeout()
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await APIClient.shared.markSessionDone(sessionId: session.publicId)
                appState.navigateToThankYou()
            } catch {
                isLoading = false
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = "Failed to complete. Returning to home..."
                }

                // Still navigate to thank you after brief delay
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                appState.navigateToThankYou()
            }
        }
    }
}
