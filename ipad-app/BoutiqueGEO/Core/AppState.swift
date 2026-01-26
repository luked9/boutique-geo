import Foundation
import SwiftUI

enum Screen {
    case pairing
    case idle
    case rating
    case consent
    case handoff
    case thankYou
}

@MainActor
class AppState: ObservableObject {
    @Published var currentScreen: Screen = .pairing
    @Published var storePublicId: String? {
        didSet {
            if let id = storePublicId {
                UserDefaults.standard.set(id, forKey: Config.storeIdKey)
            } else {
                UserDefaults.standard.removeObject(forKey: Config.storeIdKey)
            }
        }
    }

    @Published var currentSession: ReviewSession?
    @Published var currentOrder: Order?
    @Published var generatedReview: String?
    @Published var errorMessage: String?

    func initialize() {
        if let savedStoreId = UserDefaults.standard.string(forKey: Config.storeIdKey) {
            storePublicId = savedStoreId
            navigateToIdle()
        } else {
            navigateToPairing()
        }
    }

    func navigateToPairing() {
        withAnimation {
            currentScreen = .pairing
            resetSessionData()
        }
    }

    func navigateToIdle() {
        withAnimation {
            currentScreen = .idle
            resetSessionData()
        }
    }

    func navigateToRating(session: ReviewSession, order: Order?) {
        withAnimation {
            currentSession = session
            currentOrder = order
            currentScreen = .rating
        }
    }

    func navigateToConsent(review: String) {
        withAnimation {
            generatedReview = review
            currentScreen = .consent
        }
    }

    func navigateToHandoff() {
        withAnimation {
            currentScreen = .handoff
        }
    }

    func navigateToThankYou() {
        withAnimation {
            currentScreen = .thankYou
        }
    }

    func resetToIdle() {
        navigateToIdle()
    }

    func resetSessionData() {
        currentSession = nil
        currentOrder = nil
        generatedReview = nil
        errorMessage = nil
    }

    func setError(_ message: String) {
        errorMessage = message
    }

    func clearError() {
        errorMessage = nil
    }
}
