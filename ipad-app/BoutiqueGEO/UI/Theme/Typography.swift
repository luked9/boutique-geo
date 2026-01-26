import SwiftUI

struct Typography {
    // Display - Large, thin, elegant
    static let displayLarge = Font.system(size: 72, weight: .thin, design: .default)
    static let displayMedium = Font.system(size: 56, weight: .thin, design: .default)
    static let displaySmall = Font.system(size: 44, weight: .light, design: .default)

    // Headline - Clean and refined
    static let headlineLarge = Font.system(size: 36, weight: .light, design: .default)
    static let headlineMedium = Font.system(size: 28, weight: .light, design: .default)
    static let headlineSmall = Font.system(size: 22, weight: .regular, design: .default)

    // Body - Readable but elegant
    static let bodyLarge = Font.system(size: 20, weight: .light, design: .default)
    static let bodyMedium = Font.system(size: 17, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 15, weight: .regular, design: .default)

    // Button - Slightly tracked for elegance
    static let button = Font.system(size: 18, weight: .medium, design: .default)
    static let buttonLarge = Font.system(size: 20, weight: .medium, design: .default)

    // Caption
    static let caption = Font.system(size: 13, weight: .regular, design: .default)
}

// Letter spacing extension for boutique feel
extension View {
    func boutiqueTracking(_ value: CGFloat = 2) -> some View {
        self.tracking(value)
    }
}

extension Text {
    func tracking(_ value: CGFloat) -> Text {
        self.kerning(value)
    }
}
