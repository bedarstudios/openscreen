import { describe, expect, it } from "vitest";
import {
	APP_ID,
	LEGACY_PROJECT_FILE_EXTENSIONS,
	LEGACY_STORAGE_KEYS,
	NATIVE_HELPERS,
	PRODUCT_NAME,
	PROJECT_FILE_EXTENSION,
	STORAGE_KEYS,
} from "./productIdentity";

describe("Showhow product identity", () => {
	it("uses Showhow for every new identifier", () => {
		expect(PRODUCT_NAME).toBe("Showhow");
		expect(APP_ID).toBe("com.bedarstudios.showhow");
		expect(PROJECT_FILE_EXTENSION).toBe("showhow");
		expect(STORAGE_KEYS.preferences).toBe("showhow_user_preferences");
		expect(STORAGE_KEYS.systemLanguagePromptSeen).toBe("showhow_system_language_prompt_seen");
		expect(NATIVE_HELPERS.macCapture).toBe("showhow-screencapturekit-helper");
	});

	it("keeps openscreen only in legacy readers", () => {
		expect(LEGACY_PROJECT_FILE_EXTENSIONS).toEqual(["openscreen"]);
		expect(LEGACY_STORAGE_KEYS.systemLanguagePromptSeen).toBe(
			"openscreen-system-language-prompt-seen",
		);
	});
});
