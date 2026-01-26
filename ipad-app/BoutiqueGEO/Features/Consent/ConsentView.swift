import SwiftUI

struct ConsentView: View {
    @StateObject private var viewModel = ConsentViewModel()
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.lg) {
                    Text("YOUR REVIEW")
                        .font(Typography.headlineMedium)
                        .tracking(6)
                        .foregroundColor(.textSecondary)

                    Text("READY TO SHARE")
                        .font(Typography.displaySmall)
                        .tracking(4)
                        .foregroundColor(.black)
                }

                Spacer()
                    .frame(height: 50)

                // Review text in elegant quote style
                VStack(spacing: Spacing.lg) {
                    // Opening quote mark
                    Text("\u{201C}")
                        .font(.system(size: 60, weight: .thin))
                        .foregroundColor(.accent)

                    ScrollView {
                        Text(appState.generatedReview ?? "")
                            .font(Typography.bodyLarge)
                            .foregroundColor(.black)
                            .multilineTextAlignment(.center)
                            .lineSpacing(8)
                            .padding(.horizontal, Spacing.xxxl)
                    }
                    .frame(maxHeight: 200)
                    .frame(maxWidth: 600)

                    // Closing quote mark
                    Text("\u{201D}")
                        .font(.system(size: 60, weight: .thin))
                        .foregroundColor(.accent)
                }

                Spacer()
                    .frame(height: 50)

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(Typography.bodySmall)
                        .foregroundColor(.error)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, Spacing.lg)
                }

                // Buttons
                HStack(spacing: Spacing.xl) {
                    PrimaryButton(
                        title: "No Thanks",
                        style: .secondary,
                        isLoading: viewModel.isLoading && viewModel.loadingAction == .decline,
                        action: {
                            viewModel.decline(appState: appState)
                        }
                    )

                    PrimaryButton(
                        title: "Continue",
                        style: .primary,
                        isLoading: viewModel.isLoading && viewModel.loadingAction == .approve,
                        action: {
                            viewModel.approve(appState: appState)
                        }
                    )
                }

                Spacer()
            }
            .padding(.horizontal, Spacing.xxxl)
        }
    }
}

#Preview {
    ConsentView()
        .environmentObject(AppState())
}
