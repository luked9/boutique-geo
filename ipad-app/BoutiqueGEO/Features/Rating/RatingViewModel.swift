import Foundation
import SwiftUI

@MainActor
class RatingViewModel: ObservableObject {
    @Published var selectedRating: Int = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    func submitRating(appState: AppState) {
        guard selectedRating > 0 else { return }
        guard let storeId = appState.storePublicId else { return }
        guard let session = appState.currentSession else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let response = try await APIClient.shared.submitRating(
                    storeId: storeId,
                    sessionId: session.publicId,
                    rating: selectedRating
                )

                appState.navigateToConsent(review: response.generatedReviewText)
            } catch {
                isLoading = false
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = "Failed to submit rating. Please try again."
                }
            }
        }
    }
}
