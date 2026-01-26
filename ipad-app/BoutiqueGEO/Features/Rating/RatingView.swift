import SwiftUI

struct RatingView: View {
    @StateObject private var viewModel = RatingViewModel()
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.xl) {
                    Text("HOW WAS YOUR")
                        .font(Typography.headlineMedium)
                        .tracking(4)
                        .foregroundColor(.textSecondary)

                    Text("EXPERIENCE")
                        .font(Typography.displayMedium)
                        .tracking(8)
                        .foregroundColor(.black)
                }

                Spacer()
                    .frame(height: 60)

                // Gold stars - larger and more prominent
                StarRatingView(
                    rating: $viewModel.selectedRating,
                    size: 72,
                    spacing: 20
                )

                Spacer()
                    .frame(height: 20)

                // Order total if available
                if let order = appState.currentOrder {
                    Text("ORDER TOTAL: \(order.formattedTotal)")
                        .font(Typography.bodyMedium)
                        .tracking(2)
                        .foregroundColor(.textMuted)
                }

                Spacer()
                    .frame(height: 60)

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(Typography.bodySmall)
                        .foregroundColor(.error)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.bottom, Spacing.lg)
                }

                PrimaryButton(
                    title: "Continue",
                    style: .primary,
                    isLoading: viewModel.isLoading,
                    isDisabled: viewModel.selectedRating == 0,
                    action: {
                        viewModel.submitRating(appState: appState)
                    }
                )

                Spacer()

                Button {
                    appState.resetToIdle()
                } label: {
                    Text("CANCEL")
                        .font(Typography.bodyMedium)
                        .tracking(3)
                        .foregroundColor(.textMuted)
                }
                .padding(.bottom, Spacing.xxxl)
            }
            .padding(.horizontal, Spacing.xxxl)
        }
    }
}

#Preview {
    RatingView()
        .environmentObject(AppState())
}
