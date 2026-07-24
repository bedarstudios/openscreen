import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/shared/productIdentity";
import { I18nProvider, useI18n } from "./I18nContext";

function LocaleProbe() {
	const { locale, systemLocaleSuggestion } = useI18n();
	return (
		<>
			<span data-testid="locale">{locale}</span>
			<span data-testid="suggestion">{systemLocaleSuggestion ?? "none"}</span>
		</>
	);
}

describe("I18nProvider locale storage", () => {
	beforeEach(() => {
		localStorage.clear();
		Object.defineProperty(navigator, "languages", { value: ["en"], configurable: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reads a legacy locale, copies it to the Showhow key, and preserves legacy data", () => {
		localStorage.setItem(LEGACY_STORAGE_KEYS.locale, "fr");

		render(
			<I18nProvider>
				<LocaleProbe />
			</I18nProvider>,
		);

		expect(screen.getByTestId("locale").textContent).toBe("fr");
		expect(localStorage.getItem(STORAGE_KEYS.locale)).toBe("fr");
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.locale)).toBe("fr");
	});

	it("copies a legacy prompt-seen value forward and suppresses the prompt", async () => {
		Object.defineProperty(navigator, "languages", { value: ["fr"], configurable: true });
		localStorage.setItem(LEGACY_STORAGE_KEYS.systemLanguagePromptSeen, "1");

		render(
			<I18nProvider>
				<LocaleProbe />
			</I18nProvider>,
		);

		await waitFor(() => expect(screen.getByTestId("suggestion").textContent).toBe("none"));
		expect(localStorage.getItem(STORAGE_KEYS.systemLanguagePromptSeen)).toBe("1");
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.systemLanguagePromptSeen)).toBe("1");
	});

	it("marks the prompt seen only under the Showhow key", async () => {
		render(
			<I18nProvider>
				<LocaleProbe />
			</I18nProvider>,
		);

		await waitFor(() =>
			expect(localStorage.getItem(STORAGE_KEYS.systemLanguagePromptSeen)).toBe("1"),
		);
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.systemLanguagePromptSeen)).toBeNull();
	});

	it("prefers the current prompt state over legacy state", async () => {
		Object.defineProperty(navigator, "languages", { value: ["fr"], configurable: true });
		localStorage.setItem(STORAGE_KEYS.systemLanguagePromptSeen, "0");
		localStorage.setItem(LEGACY_STORAGE_KEYS.systemLanguagePromptSeen, "1");

		render(
			<I18nProvider>
				<LocaleProbe />
			</I18nProvider>,
		);

		await waitFor(() => expect(screen.getByTestId("suggestion").textContent).toBe("fr"));
		expect(localStorage.getItem(STORAGE_KEYS.systemLanguagePromptSeen)).toBe("0");
		expect(localStorage.getItem(LEGACY_STORAGE_KEYS.systemLanguagePromptSeen)).toBe("1");
	});

	it("falls back safely when locale storage reads throw", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("read failed");
		});

		expect(() =>
			render(
				<I18nProvider>
					<LocaleProbe />
				</I18nProvider>,
			),
		).not.toThrow();
		expect(screen.getByTestId("locale").textContent).toBe("en");
	});

	it("retains safe behavior when prompt-state writes throw", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("write failed");
		});

		expect(() =>
			render(
				<I18nProvider>
					<LocaleProbe />
				</I18nProvider>,
			),
		).not.toThrow();
	});
});
