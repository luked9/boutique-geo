import SwiftUI

struct PairingView: View {
    @StateObject private var viewModel = PairingViewModel()
    @EnvironmentObject var appState: AppState
    @FocusState private var isInputFocused: Bool

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Logo
                VStack(spacing: Spacing.md) {
                    Text("BOUTIQUE")
                        .font(Typography.displaySmall)
                        .tracking(8)
                        .foregroundColor(.black)

                    Text("GEO")
                        .font(Typography.headlineLarge)
                        .tracking(12)
                        .foregroundColor(.black)
                }

                Spacer()
                    .frame(height: 40)

                // Divider
                Rectangle()
                    .fill(Color.black)
                    .frame(width: 40, height: 1)

                Spacer()
                    .frame(height: 40)

                Text("KIOSK SETUP")
                    .font(Typography.headlineSmall)
                    .tracking(4)
                    .foregroundColor(.textSecondary)

                Spacer()
                    .frame(height: 60)

                // Store ID input
                VStack(spacing: Spacing.lg) {
                    Text("STORE ID")
                        .font(Typography.caption)
                        .tracking(2)
                        .foregroundColor(.textMuted)

                    TextField("", text: $viewModel.storeId)
                        .font(Typography.bodyLarge)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, Spacing.lg)
                        .frame(maxWidth: 400)
                        .overlay(
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(.black.opacity(0.3)),
                            alignment: .bottom
                        )
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($isInputFocused)
                        .submitLabel(.done)
                        .onSubmit {
                            viewModel.pair(appState: appState)
                        }

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(Typography.bodySmall)
                            .foregroundColor(.error)
                            .multilineTextAlignment(.center)
                            .padding(.top, Spacing.sm)
                    }
                }

                Spacer()
                    .frame(height: 60)

                PrimaryButton(
                    title: "Connect",
                    style: .primary,
                    isLoading: viewModel.isLoading,
                    isDisabled: viewModel.storeId.isEmpty,
                    action: {
                        isInputFocused = false
                        viewModel.pair(appState: appState)
                    }
                )

                Spacer()
            }
            .padding(.horizontal, Spacing.xxxl)
        }
        .onTapGesture {
            isInputFocused = false
        }
    }
}

#Preview {
    PairingView()
        .environmentObject(AppState())
}
