import SwiftUI

struct HandoffView: View {
    @StateObject private var viewModel = HandoffViewModel()
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.lg) {
                    Text("SCAN TO POST")
                        .font(Typography.headlineMedium)
                        .tracking(6)
                        .foregroundColor(.textSecondary)

                    Text("YOUR REVIEW")
                        .font(Typography.displaySmall)
                        .tracking(4)
                        .foregroundColor(.black)
                }

                Spacer()
                    .frame(height: 50)

                // QR Code with elegant border
                if let session = appState.currentSession {
                    let reviewURL = Config.Endpoints.reviewURL(sessionId: session.publicId)
                    VStack(spacing: Spacing.lg) {
                        QRCodeView(url: reviewURL, size: 280)
                            .padding(Spacing.xl)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.black, lineWidth: 1)
                            )

                        Text("OPEN YOUR CAMERA")
                            .font(Typography.caption)
                            .tracking(2)
                            .foregroundColor(.textMuted)
                    }
                }

                Spacer()
                    .frame(height: 40)

                // Timer
                HStack(spacing: Spacing.sm) {
                    Circle()
                        .stroke(Color.black.opacity(0.2), lineWidth: 2)
                        .frame(width: 24, height: 24)
                        .overlay(
                            Circle()
                                .trim(from: 0, to: CGFloat(viewModel.remainingSeconds) / 30.0)
                                .stroke(Color.black, lineWidth: 2)
                                .rotationEffect(.degrees(-90))
                        )

                    Text("\(viewModel.remainingSeconds)s")
                        .font(Typography.bodyMedium)
                        .foregroundColor(.textSecondary)
                }

                Spacer()
                    .frame(height: 40)

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(Typography.bodySmall)
                        .foregroundColor(.error)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, Spacing.lg)
                }

                PrimaryButton(
                    title: "Done",
                    style: .primary,
                    isLoading: viewModel.isLoading,
                    action: {
                        viewModel.markDone(appState: appState)
                    }
                )

                Spacer()
            }
            .padding(.horizontal, Spacing.xxxl)
        }
        .onAppear {
            viewModel.startTimeout(appState: appState)
        }
        .onDisappear {
            viewModel.stopTimeout()
        }
    }
}

#Preview {
    HandoffView()
        .environmentObject(AppState())
}
