import SwiftUI

struct IdleView: View {
    @StateObject private var viewModel = IdleViewModel()
    @EnvironmentObject var appState: AppState
    @GestureState private var isLongPressing = false

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Logo with hidden settings access
                VStack(spacing: Spacing.lg) {
                    Text("BOUTIQUE")
                        .font(Typography.displayLarge)
                        .tracking(12)
                        .foregroundColor(.black)

                    Text("GEO")
                        .font(Typography.displayMedium)
                        .tracking(20)
                        .foregroundColor(.black)
                }
                .gesture(
                    LongPressGesture(minimumDuration: 3.0)
                        .onEnded { _ in
                            viewModel.showSettings(appState: appState)
                        }
                )

                Spacer()
                    .frame(height: 80)

                // Divider line
                Rectangle()
                    .fill(Color.black)
                    .frame(width: 60, height: 1)

                Spacer()
                    .frame(height: 80)

                Text("TAP TO BEGIN")
                    .font(Typography.headlineMedium)
                    .tracking(6)
                    .foregroundColor(.textSecondary)

                Spacer()

                // Subtle polling indicator at bottom
                if viewModel.isPolling {
                    HStack(spacing: Spacing.sm) {
                        Circle()
                            .fill(Color.accent)
                            .frame(width: 6, height: 6)
                        Text("READY")
                            .font(Typography.caption)
                            .tracking(2)
                            .foregroundColor(.textMuted)
                    }
                    .padding(.bottom, Spacing.xl)
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(Typography.bodySmall)
                        .foregroundColor(.error)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.bottom, Spacing.xl)
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            viewModel.handleTap(appState: appState)
        }
        .onAppear {
            viewModel.startPolling(appState: appState)
        }
        .onDisappear {
            viewModel.stopPolling()
        }
        .alert("Kiosk Settings", isPresented: $viewModel.showSettingsAlert) {
            Button("Re-pair Device", role: .destructive) {
                viewModel.unpairDevice(appState: appState)
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Current Store ID: \(appState.storePublicId ?? "Unknown")")
        }
    }
}

#Preview {
    IdleView()
        .environmentObject(AppState())
}
