import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const localesDirectory = path.resolve("src/i18n/locales");
const locales = fs
	.readdirSync(localesDirectory, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();
const namespaces = fs
	.readdirSync(path.join(localesDirectory, "en"))
	.filter((file) => file.endsWith(".json"))
	.sort();

function readNamespace(locale: string, namespace: string): unknown {
	return JSON.parse(
		fs.readFileSync(path.join(localesDirectory, locale, namespace), "utf8"),
	) as unknown;
}

function flatten(value: unknown, prefix = ""): Array<[string, string]> {
	if (typeof value === "string") return [[prefix, value]];
	if (!value || typeof value !== "object" || Array.isArray(value)) return [];
	return Object.entries(value).flatMap(([key, child]) =>
		flatten(child, prefix ? `${prefix}.${key}` : key),
	);
}

function flattenedKeys(value: unknown): string[] {
	return flatten(value)
		.map(([key]) => key)
		.sort();
}

describe("visible Showhow translations", () => {
	it("uses Showhow fallbacks and favicon in application entry points", () => {
		const electronMain = fs.readFileSync(path.resolve("electron/main.ts"), "utf8");
		const electronHandlers = fs.readFileSync(path.resolve("electron/ipc/handlers.ts"), "utf8");
		const electronWindows = fs.readFileSync(path.resolve("electron/windows.ts"), "utf8");
		const windowsCursorDiagnostic = fs.readFileSync(
			path.resolve("scripts/test-windows-native-cursor.mjs"),
			"utf8",
		);
		const appComponent = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
		const settingsPanel = fs.readFileSync(
			path.resolve("src/components/video-editor/SettingsPanel.tsx"),
			"utf8",
		);
		const indexHtml = fs.readFileSync(path.resolve("index.html"), "utf8");

		expect(electronMain).toContain('"About Showhow"');
		expect(electronMain).toContain('"Hide Showhow"');
		expect(electronMain).toContain(': "Showhow"');
		expect(electronMain).toContain('getTrayIcon("showhow.png"');
		expect(electronMain).not.toMatch(/OpenScreen|openscreen\.png/);
		expect(electronHandlers).toContain("Allow Showhow under System Settings");
		expect(electronHandlers).toContain("Allow Showhow in macOS System Settings");
		expect(electronHandlers).toContain("`showhow-diagnostic-${Date.now()}.json`");
		expect(electronHandlers).not.toContain("`openscreen-diagnostic-${Date.now()}.json`");
		expect(electronWindows).toContain('title: "Showhow"');
		expect(electronWindows).toContain('title: "Showhow - Notes"');
		expect(electronWindows).not.toMatch(/title: "OpenScreen(?: - Notes)?"/);
		expect(windowsCursorDiagnostic).toContain("<title>Showhow native cursor diagnostic</title>");
		expect(windowsCursorDiagnostic).toContain("<h1>Showhow native cursor diagnostic</h1>");
		expect(windowsCursorDiagnostic).toContain(
			"<title>Showhow native cursor real capture diagnostic</title>",
		);
		expect(windowsCursorDiagnostic).not.toMatch(/<(?:title|h1)>OpenScreen/);
		expect(appComponent).toContain("<h1>Showhow</h1>");
		expect(appComponent).not.toContain("<h1>Openscreen</h1>");
		expect(settingsPanel).toContain("https://github.com/bedarstudios/showhow-desktop");
		expect(settingsPanel).not.toContain("EtienneLescot/openscreen");
		expect(indexHtml).toContain('href="/showhow.png"');
		expect(indexHtml).not.toMatch(/vite\.svg|openscreen/i);
	});

	it("keeps exact translation-key parity across all 13 locales", () => {
		expect(locales).toHaveLength(13);
		for (const namespace of namespaces) {
			const englishKeys = flattenedKeys(readNamespace("en", namespace));
			for (const locale of locales) {
				const localeKeys = flattenedKeys(readNamespace(locale, namespace));
				expect(localeKeys, `${locale}/${namespace}`).toEqual(englishKeys);
			}
		}
	});

	it("uses literal Showhow for every visible product-name occurrence", () => {
		for (const locale of locales) {
			for (const namespace of namespaces) {
				for (const [key, value] of flatten(readNamespace(locale, namespace))) {
					expect(value, `${locale}/${namespace}:${key}`).not.toContain("OpenScreen");
				}
			}

			const common = readNamespace(locale, "common.json") as {
				actions: { about: string; hide: string };
			};
			const editor = readNamespace(locale, "editor.json") as {
				recording: { accessibilityAllowAndRetry: string };
			};
			const launch = readNamespace(locale, "launch.json") as {
				systemLanguagePrompt: { description: string };
			};
			expect(common.actions.about, locale).toContain("Showhow");
			expect(common.actions.hide, locale).toContain("Showhow");
			expect(editor.recording.accessibilityAllowAndRetry, locale).toContain("Showhow");
			expect(launch.systemLanguagePrompt.description, locale).toContain("Showhow");
		}

		const frenchCommon = readNamespace("fr", "common.json") as {
			actions: { about: string };
		};
		expect(frenchCommon.actions.about).toBe("À propos de Showhow");
	});

	it("names .showhow before legacy .openscreen only in project compatibility copy", () => {
		for (const locale of locales) {
			const compatibilityOccurrences: string[] = [];
			for (const namespace of namespaces) {
				for (const [key, value] of flatten(readNamespace(locale, namespace))) {
					if (!value.includes(".openscreen")) continue;
					compatibilityOccurrences.push(`${namespace}:${key}`);
					expect(value.indexOf(".showhow"), `${locale}:${key}`).toBeLessThan(
						value.indexOf(".openscreen"),
					);
				}
			}
			expect(compatibilityOccurrences, locale).toEqual([
				"editor.json:emptyState.dragDropHint",
				"editor.json:emptyState.dropErrors.unsupportedFormatMessage",
			]);

			const dialogs = readNamespace(locale, "dialogs.json") as {
				fileDialogs: Record<string, string>;
			};
			expect(dialogs.fileDialogs.showhowProject, locale).toContain("Showhow");
			expect(dialogs.fileDialogs).not.toHaveProperty("openScreenProject");
			expect(dialogs.fileDialogs).not.toHaveProperty("openscreenProject");
		}
	});
});
