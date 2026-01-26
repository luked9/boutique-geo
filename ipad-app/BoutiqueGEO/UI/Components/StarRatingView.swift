import SwiftUI

struct StarRatingView: View {
    @Binding var rating: Int
    var size: CGFloat = 60
    var spacing: CGFloat = 16

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(1...5, id: \.self) { index in
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        rating = index
                    }
                } label: {
                    Image(systemName: index <= rating ? "star.fill" : "star")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: size, height: size)
                        .foregroundColor(index <= rating ? .starFilled : .starEmpty)
                        .scaleEffect(index == rating ? 1.15 : 1.0)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
}

// Read-only display version for smaller contexts
struct StarDisplayView: View {
    let rating: Int
    var size: CGFloat = 20
    var spacing: CGFloat = 4

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(1...5, id: \.self) { index in
                Image(systemName: index <= rating ? "star.fill" : "star")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: size, height: size)
                    .foregroundColor(index <= rating ? .starFilled : .starEmpty)
            }
        }
    }
}

#Preview {
    struct PreviewWrapper: View {
        @State private var rating = 4

        var body: some View {
            VStack(spacing: 60) {
                StarRatingView(rating: $rating, size: 72, spacing: 20)
                StarDisplayView(rating: rating, size: 24, spacing: 6)
                Text("Rating: \(rating)")
                    .font(Typography.bodyMedium)
            }
            .padding(40)
        }
    }

    return PreviewWrapper()
}
