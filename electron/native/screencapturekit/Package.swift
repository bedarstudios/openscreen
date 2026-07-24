// swift-tools-version: 5.9

import PackageDescription

let package = Package(
	name: "ShowhowScreenCaptureKitHelper",
	platforms: [
		.macOS(.v13)
	],
	products: [
		.executable(
			name: "showhow-screencapturekit-helper",
			targets: ["ShowhowScreenCaptureKitHelper"]
		),
		.executable(
			name: "showhow-macos-cursor-helper",
			targets: ["ShowhowMacOSCursorHelper"]
		)
	],
	targets: [
		.executableTarget(
			name: "ShowhowScreenCaptureKitHelper",
			path: "Sources/ShowhowScreenCaptureKitHelper"
		),
		.executableTarget(
			name: "ShowhowMacOSCursorHelper",
			path: "Sources/ShowhowMacOSCursorHelper"
		)
	]
)
