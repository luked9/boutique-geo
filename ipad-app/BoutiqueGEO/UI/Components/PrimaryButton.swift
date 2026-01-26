import SwiftUI

enum ButtonStyle {
    case primary    // Black background, white text
    case secondary  // White background, black border
    case text       // Text only, no background
}

struct PrimaryButton: View {
    let title: String
    var style: ButtonStyle = .primary
    var isLoading: Bool = false
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.md) {
                if isLoading {
                    ProgressView()
                        .tint(style == .primary ? .white : .black)
                }
                Text(title.uppercased())
                    .tracking(3)
                    .font(Typography.button)
            }
            .foregroundColor(foregroundColor)
            .frame(maxWidth: 420)
            .frame(height: 60)
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(borderColor, lineWidth: style == .secondary ? 1 : 0)
            )
        }
        .disabled(isLoading || isDisabled)
        .opacity(isDisabled ? 0.5 : 1.0)
    }

    private var foregroundColor: Color {
        switch style {
        case .primary:
            return .white
        case .secondary, .text:
            return .black
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:
            return .black
        case .secondary, .text:
            return .white
        }
    }

    private var borderColor: Color {
        switch style {
        case .secondary:
            return .black
        default:
            return .clear
        }
    }
}

// Convenience initializers
extension PrimaryButton {
    static func primary(_ title: String, isLoading: Bool = false, action: @escaping () -> Void) -> PrimaryButton {
        PrimaryButton(title: title, style: .primary, isLoading: isLoading, action: action)
    }

    static func secondary(_ title: String, isLoading: Bool = false, action: @escaping () -> Void) -> PrimaryButton {
        PrimaryButton(title: title, style: .secondary, isLoading: isLoading, action: action)
    }
}

#Preview {
    VStack(spacing: 32) {
        PrimaryButton(title: "Continue", style: .primary, action: {})
        PrimaryButton(title: "Go Back", style: .secondary, action: {})
        PrimaryButton(title: "Loading", style: .primary, isLoading: true, action: {})
    }
    .padding(40)
    .background(Color.white)
}
