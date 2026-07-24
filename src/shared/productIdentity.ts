export const PRODUCT_NAME = "Showhow";
export const PACKAGE_NAME = "showhow-desktop";
export const APP_ID = "com.bedarstudios.showhow";
export const PROJECT_FILE_EXTENSION = "showhow";
export const LEGACY_PROJECT_FILE_EXTENSIONS = ["openscreen"] as const;

export const STORAGE_KEYS = {
	preferences: "showhow_user_preferences",
	customFonts: "showhow_custom_fonts",
	locale: "showhow-locale",
	systemLanguagePromptSeen: "showhow_system_language_prompt_seen",
	sourceCache: "showhow-source-cache",
} as const;

export const LEGACY_STORAGE_KEYS = {
	preferences: "openscreen_user_preferences",
	customFonts: "openscreen_custom_fonts",
	locale: "openscreen-locale",
	systemLanguagePromptSeen: "openscreen-system-language-prompt-seen",
	sourceCache: "openscreen-source-cache",
} as const;

export const NATIVE_HELPERS = {
	macCapture: "showhow-screencapturekit-helper",
	macCursor: "showhow-macos-cursor-helper",
	windowsCapture: "showhow-wgc-capture.exe",
	windowsCursor: "showhow-cursor-sampler.exe",
} as const;
