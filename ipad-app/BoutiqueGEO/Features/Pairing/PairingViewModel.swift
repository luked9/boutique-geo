import Foundation
import SwiftUI

@MainActor
class PairingViewModel: ObservableObject {
    @Published var storeId: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func pair(appState: AppState) {
        guard !storeId.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "Please enter a valid Store ID"
            return
        }

        let trimmedId = storeId.trimmingCharacters(in: .whitespaces)

        isLoading = true
        errorMessage = nil

        Task {
            do {
                // Validate by attempting to fetch next session
                _ = try await APIClient.shared.getNextSession(storeId: trimmedId)

                // Store ID is valid
                appState.storePublicId = trimmedId
                appState.navigateToIdle()
            } catch {
                isLoading = false
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = "Failed to connect to store. Please check the ID and try again."
                }
            }
        }
    }
}
