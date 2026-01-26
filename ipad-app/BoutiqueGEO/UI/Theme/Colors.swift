import SwiftUI

extension Color {
    // Background - Pure white for boutique cleanliness
    static let background = Color.white
    static let surface = Color.white

    // Text - Elegant black
    static let textPrimary = Color.black
    static let textSecondary = Color(white: 0.4)
    static let textMuted = Color(white: 0.6)

    // Primary - Elegant black for buttons
    static let primary = Color.black
    static let primaryText = Color.white

    // Secondary - White with black border
    static let secondary = Color.white
    static let secondaryText = Color.black

    // Stars - Luxurious gold
    static let starFilled = Color(red: 0.85, green: 0.70, blue: 0.35)  // Elegant muted gold
    static let starEmpty = Color(white: 0.85)

    // Accent - Subtle gold for highlights
    static let accent = Color(red: 0.85, green: 0.70, blue: 0.35)

    // Error - Muted red
    static let error = Color(red: 0.75, green: 0.25, blue: 0.25)

    // Success - Muted green
    static let success = Color(red: 0.25, green: 0.65, blue: 0.45)
}
