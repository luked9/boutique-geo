import SwiftUI

struct ThankYouView: View {
    @EnvironmentObject var appState: AppState
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.xxxl) {
                    // Gold accent star
                    Image(systemName: "star.fill")
                        .font(.system(size: 48, weight: .thin))
                        .foregroundColor(.accent)

                    VStack(spacing: Spacing.lg) {
                        Text("THANK YOU")
                            .font(Typography.displayMedium)
                            .tracking(10)
                            .foregroundColor(.black)

                        Rectangle()
                            .fill(Color.black)
                            .frame(width: 40, height: 1)

                        Text("WE APPRECIATE YOUR FEEDBACK")
                            .font(Typography.bodyMedium)
                            .tracking(3)
                            .foregroundColor(.textSecondary)
                    }
                }
                .opacity(opacity)

                Spacer()
            }
        }
        .onAppear {
            // Fade in
            withAnimation(.easeIn(duration: 0.5)) {
                opacity = 1
            }

            // Auto-reset after delay
            Task {
                try? await Task.sleep(nanoseconds: UInt64(Config.thankYouDuration * 1_000_000_000))
                withAnimation(.easeOut(duration: 0.3)) {
                    opacity = 0
                }
                try? await Task.sleep(nanoseconds: 300_000_000) // 0.3s for fade out
                appState.resetToIdle()
            }
        }
    }
}

#Preview {
    ThankYouView()
        .environmentObject(AppState())
}
