import Foundation

// MARK: - Session Status
enum SessionStatus: String, Codable {
    case pending = "PENDING"
    case declined = "DECLINED"
    case approved = "APPROVED"
    case postedIntent = "POSTED_INTENT"
}

// MARK: - Store
struct Store: Codable, Identifiable {
    let id: String
    let publicId: String
    let name: String
    let primaryReviewPlatform: String
    let reviewDestinationUrl: String
}

// MARK: - Order Item
struct OrderItem: Codable, Identifiable {
    var id: String { name }
    let name: String
    let quantity: Int
    let amount: Int
}

// MARK: - Order
struct Order: Codable, Identifiable {
    var id: String { "\(totalAmount)-\(currency)" }
    let totalAmount: Int
    let currency: String
    let items: [OrderItem]

    var formattedTotal: String {
        let dollars = Double(totalAmount) / 100.0
        return String(format: "$%.2f", dollars)
    }
}

// MARK: - Review Session
struct ReviewSession: Codable, Identifiable {
    var id: String { publicId }
    let publicId: String
    let status: SessionStatus
    let starRating: Int?
    let generatedReviewText: String?
    let createdAt: String
}

// MARK: - API Response Types

struct NextSessionResponse: Codable {
    let session: ReviewSession?
    let order: Order?
}

struct RatingResponse: Codable {
    let generatedReviewText: String
}

struct StandardResponse: Codable {
    let ok: Bool
}

// MARK: - API Error
enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case serverError(Int, String)
    case decodingError(Error)
    case noStoreConfigured
    case noActiveSession

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid request URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .noStoreConfigured:
            return "No store configured. Please pair the device."
        case .noActiveSession:
            return "No active session found"
        }
    }
}
