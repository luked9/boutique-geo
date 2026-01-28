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

                    // Display stars based on rating
                    HStack(spacing: 8) {
                        ForEach(1...5, id: \.self) { index in
                            Image(systemName: index <= appState.selectedRating ? "star.fill" : "star")
                                .font(.system(size: 24, weight: .thin))
                                .foregroundColor(index <= appState.selectedRating ? .accent : .gray.opacity(0.3))
                        }
                    }
                    .padding(.top, Spacing.sm)
                }

                Spacer()

                // Review text in elegant quote style
                VStack(spacing: Spacing.sm) {
                    // Opening quote mark
                    Text("\u{201C}")
                        .font(.system(size: 60, weight: .thin))
                        .foregroundColor(.accent)

                    Text(appState.generatedReview ?? "")
                        .font(Typography.bodyLarge)
                        .foregroundColor(.black)
                        .multilineTextAlignment(.center)
                        .lineSpacing(8)
                        .padding(.horizontal, Spacing.xxxl)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: 600)

                    // Closing quote mark
                    Text("\u{201D}")
                        .font(.system(size: 60, weight: .thin))
                        .foregroundColor(.accent)
                }

                Spacer()

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
                .padding(.bottom, Spacing.xl)
            }
            .padding(.horizontal, Spacing.xxxl)
        }
    }
}

#Preview {
    ConsentView()
        .environmentObject(AppState())
}
