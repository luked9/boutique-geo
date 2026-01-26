.PHONY: generate build clean

# Generate Xcode project from project.yml
generate:
	@if ! command -v xcodegen &> /dev/null; then \
		echo "Installing xcodegen..."; \
		brew install xcodegen; \
	fi
	xcodegen generate

# Build the project
build:
	xcodebuild -project BoutiqueGEO.xcodeproj -scheme BoutiqueGEO -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)' build

# Clean build artifacts
clean:
	xcodebuild -project BoutiqueGEO.xcodeproj -scheme BoutiqueGEO clean
	rm -rf ~/Library/Developer/Xcode/DerivedData/BoutiqueGEO-*

# Open in Xcode
open:
	open BoutiqueGEO.xcodeproj
