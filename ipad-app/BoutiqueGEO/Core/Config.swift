import Foundation

struct Config {
    // Use Mac's local IP for phone QR scanning (same WiFi)
    // Change back to localhost:3000 for production deployment
    static let apiBaseURL = "http://172.168.0.157:3000"
    static let requestTimeout: TimeInterval = 30.0
    static let idlePollingInterval: TimeInterval = 7.0
    static let handoffTimeout: TimeInterval = 30.0
    static let thankYouDuration: TimeInterval = 3.0

    static let storeIdKey = "boutique_geo_store_id"

    struct Endpoints {
        static func next(storeId: String) -> String {
            "/api/v1/kiosk/\(storeId)/next"
        }

        static func rating(storeId: String, sessionId: String) -> String {
            "/api/v1/kiosk/\(storeId)/sessions/\(sessionId)/rating"
        }

        static func approve(storeId: String, sessionId: String) -> String {
            "/api/v1/kiosk/\(storeId)/sessions/\(sessionId)/approve"
        }

        static func decline(storeId: String, sessionId: String) -> String {
            "/api/v1/kiosk/\(storeId)/sessions/\(sessionId)/decline"
        }

        static func done(sessionId: String) -> String {
            "/api/v1/review/\(sessionId)/done"
        }

        static func reviewURL(sessionId: String) -> String {
            "\(apiBaseURL)/r/\(sessionId)"
        }
    }
}
