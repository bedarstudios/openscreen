import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/shared/productIdentity";
import { type CustomFont, getCustomFonts, saveCustomFonts } from "./customFonts";

const font: CustomFont = {
	id: "inter",
	name: "Inter",
	fontFamily: "Inter",
	importUrl: "https://fonts.googleapis.com/css2?family=Inter",
};

describe("custom font storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reads legacy fonts, copies them to the Showhow key, and preserves legacy data", () => {
		const legacyValue = JSON.stringify([font]);
		localStorage.setItem(LEGACY_STORAGE_KEYS.customFonts, legacyValue);

		expect(getCustomFonts()).toEqual([font]);
		expect(localStorage.getItem(STORAGE_KEYS.customFonts)).toBe(legacyValue);
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.customFonts)).toBe(legacyValue);
	});

	it("saves fonts to the Showhow key", () => {
		saveCustomFonts([font]);

		expect(localStorage.getItem(STORAGE_KEYS.customFonts)).toBe(JSON.stringify([font]));
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.customFonts)).toBeNull();
	});

	it("preserves malformed JSON behavior after copying legacy data", () => {
		localStorage.setItem(LEGACY_STORAGE_KEYS.customFonts, "not-json");

		expect(getCustomFonts()).toEqual([]);
		expect(localStorage.getItem(STORAGE_KEYS.customFonts)).toBe("not-json");
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.customFonts)).toBe("not-json");
	});

	it("returns an empty list and logs when storage reads throw", () => {
		const error = new Error("read failed");
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw error;
		});
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

		expect(getCustomFonts()).toEqual([]);
		expect(consoleError).toHaveBeenCalledWith("Failed to load custom fonts from storage:", error);
	});

	it("returns an empty list and logs when copy-forward writes throw", () => {
		const legacyValue = JSON.stringify([font]);
		localStorage.setItem(LEGACY_STORAGE_KEYS.customFonts, legacyValue);
		const error = new Error("copy failed");
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw error;
		});
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

		expect(getCustomFonts()).toEqual([]);
		expect(consoleError).toHaveBeenCalledWith("Failed to load custom fonts from storage:", error);
	});

	it("logs and does not throw when storage writes fail", () => {
		const error = new Error("write failed");
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw error;
		});
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

		expect(() => saveCustomFonts([font])).not.toThrow();
		expect(consoleError).toHaveBeenCalledWith("Failed to save custom fonts to storage:", error);
	});
});
