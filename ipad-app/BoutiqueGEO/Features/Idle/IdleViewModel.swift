import Foundation
import SwiftUI

@MainActor
class IdleViewModel: ObservableObject {
    @Published var isPolling = false
    @Published var errorMessage: String?
    @Published var showSettingsAlert = false

    private var pollingTask: Task<Void, Never>?

    func startPolling(appState: AppState) {
        guard pollingTask == nil else { return }

        pollingTask = Task {
            while !Task.isCancelled {
                await checkForPendingSession(appState: appState)

                try? await Task.sleep(nanoseconds: UInt64(Config.idlePollingInterval * 1_000_000_000))
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    func handleTap(appState: AppState) {
        Task {
            await checkForPendingSession(appState: appState)
        }
    }

    func showSettings(appState: AppState) {
        showSettingsAlert = true
    }

    func unpairDevice(appState: AppState) {
        stopPolling()
        appState.storePublicId = nil
        appState.navigateToPairing()
    }

    private func checkForPendingSession(appState: AppState) async {
        guard let storeId = appState.storePublicId else {
            errorMessage = "No store configured"
            return
        }

        isPolling = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getNextSession(storeId: storeId)

            if let session = response.session, session.status == .pending {
                // Found pending session
                stopPolling()
                appState.navigateToRating(session: session, order: response.order)
            }
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            } else {
                errorMessage = "Connection error. Retrying..."
            }
        }

        isPolling = false
    }
}
