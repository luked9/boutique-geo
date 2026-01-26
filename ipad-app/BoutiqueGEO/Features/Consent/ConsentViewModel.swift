import Foundation
import SwiftUI

enum ConsentAction {
    case approve
    case decline
}

@MainActor
class ConsentViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var loadingAction: ConsentAction?
    @Published var errorMessage: String?

    func approve(appState: AppState) {
        guard let storeId = appState.storePublicId else { return }
        guard let session = appState.currentSession else { return }

        isLoading = true
        loadingAction = .approve
        errorMessage = nil

        Task {
            do {
                try await APIClient.shared.approveSession(
                    storeId: storeId,
                    sessionId: session.publicId
                )

                appState.navigateToHandoff()
            } catch {
                isLoading = false
                loadingAction = nil
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = "Failed to approve review. Please try again."
                }
            }
        }
    }

    func decline(appState: AppState) {
        guard let storeId = appState.storePublicId else { return }
        guard let session = appState.currentSession else { return }

        isLoading = true
        loadingAction = .decline
        errorMessage = nil

        Task {
            do {
                try await APIClient.shared.declineSession(
                    storeId: storeId,
                    sessionId: session.publicId
                )

                appState.navigateToThankYou()
            } catch {
                isLoading = false
                loadingAction = nil
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = "Failed to decline review. Please try again."
                }
            }
        }
    }
}
