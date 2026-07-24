import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	HELPER_IDENTITIES,
	orderedHelperCandidates,
	orderedHelperNames,
	resolveCompatibleEnv,
} from "./helperIdentity";

describe("resolveCompatibleEnv", () => {
	it("prefers a non-empty Showhow override", () => {
		expect(
			resolveCompatibleEnv(
				{ SHOWHOW_HELPER: " /new ", OPENSCREEN_HELPER: "/old" },
				"SHOWHOW_HELPER",
				"OPENSCREEN_HELPER",
			),
		).toBe("/new");
	});

	it("falls back to the legacy override when the current value is absent or empty", () => {
		expect(
			resolveCompatibleEnv(
				{ SHOWHOW_HELPER: "  ", OPENSCREEN_HELPER: " /old " },
				"SHOWHOW_HELPER",
				"OPENSCREEN_HELPER",
			),
		).toBe("/old");
	});

	it("returns undefined when neither override is usable", () => {
		expect(resolveCompatibleEnv({}, "SHOWHOW_HELPER", "OPENSCREEN_HELPER")).toBeUndefined();
	});
});

describe("native helper identity", () => {
	it.each([
		[
			"macCapture",
			"SHOWHOW_SCK_CAPTURE_EXE",
			"OPENSCREEN_SCK_CAPTURE_EXE",
			"showhow-screencapturekit-helper",
			"openscreen-screencapturekit-helper",
		],
		[
			"macCursor",
			"SHOWHOW_MAC_CURSOR_HELPER_EXE",
			"OPENSCREEN_MAC_CURSOR_HELPER_EXE",
			"showhow-macos-cursor-helper",
			"openscreen-macos-cursor-helper",
		],
		[
			"windowsCapture",
			"SHOWHOW_WGC_CAPTURE_EXE",
			"OPENSCREEN_WGC_CAPTURE_EXE",
			"showhow-wgc-capture.exe",
			"wgc-capture.exe",
		],
		[
			"windowsCursor",
			"SHOWHOW_CURSOR_SAMPLER_EXE",
			"OPENSCREEN_CURSOR_SAMPLER_EXE",
			"showhow-cursor-sampler.exe",
			"cursor-sampler.exe",
		],
	] as const)("orders %s current identity before legacy identity", (key, currentEnv, legacyEnv, currentName, legacyName) => {
		const identity = HELPER_IDENTITIES[key];
		expect(identity).toEqual({ currentEnv, legacyEnv, currentName, legacyName });
		expect(orderedHelperNames(identity)).toEqual([currentName, legacyName]);
	});

	it.each(
		Object.entries(HELPER_IDENTITIES),
	)("builds %s override and packaged candidates in compatibility order", (_key, identity) => {
		const candidates = orderedHelperCandidates(
			identity,
			{ [identity.currentEnv]: " ", [identity.legacyEnv]: " /legacy-override " },
			(name) => [`local/${name}`, `packaged/${name}`],
		);
		expect(candidates).toEqual([
			"/legacy-override",
			`local/${identity.currentName}`,
			`packaged/${identity.currentName}`,
			`local/${identity.legacyName}`,
			`packaged/${identity.legacyName}`,
		]);
	});

	it("keeps native build definitions aligned with canonical helper names", () => {
		const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), "utf8");
		const swiftPackage = read("electron/native/screencapturekit/Package.swift");
		const cmake = read("electron/native/wgc-capture/CMakeLists.txt");
		const macBuild = read("scripts/build-macos-screencapturekit-helper.mjs");
		const windowsBuild = read("scripts/build-windows-wgc-helper.mjs");

		for (const identity of [HELPER_IDENTITIES.macCapture, HELPER_IDENTITIES.macCursor]) {
			expect(swiftPackage).toContain(`name: "${identity.currentName}"`);
			expect(macBuild).toContain(`"${identity.currentName}"`);
		}
		for (const identity of [HELPER_IDENTITIES.windowsCapture, HELPER_IDENTITIES.windowsCursor]) {
			expect(cmake).toContain(identity.currentName.replace(/\.exe$/, ""));
			expect(windowsBuild).toContain(`"${identity.currentName}"`);
		}
	});

	it("guards diagnostic and Windows smoke compatibility integration", () => {
		const diagnostic = fs.readFileSync(
			path.resolve("scripts/diagnostic-tool/diagnostic.mjs"),
			"utf8",
		);
		const smoke = fs.readFileSync(path.resolve("scripts/test-windows-wgc-helper.mjs"), "utf8");
		expect(diagnostic).toContain("helperPath: helper.path");
		expect(diagnostic).toContain("const helperPath = result.helperPath;");
		const smokeNames = orderedHelperNames(HELPER_IDENTITIES.windowsCapture);
		expect(smoke.indexOf(smokeNames[0])).toBeGreaterThan(-1);
		expect(smoke.indexOf(smokeNames[1])).toBeGreaterThan(smoke.indexOf(smokeNames[0]));
		expect(smoke).toContain("find((candidate) => fs.existsSync(candidate))");
	});

	it.runIf(process.platform !== "win32")(
		"skips the real Windows smoke script before helper lookup",
		() => {
			const result = spawnSync(process.execPath, ["scripts/test-windows-wgc-helper.mjs"], {
				cwd: process.cwd(),
				encoding: "utf8",
				env: {
					...process.env,
					SHOWHOW_WGC_CAPTURE_EXE: "",
					OPENSCREEN_WGC_CAPTURE_EXE: "",
				},
			});
			expect(result.status).toBe(0);
			expect(result.stdout).toContain("Skipping WGC helper smoke test: Windows-only.");
			expect(result.stderr).toBe("");
		},
	);

	it.each([
		["macCapture", "electron/ipc/handlers.ts"],
		["windowsCapture", "electron/ipc/handlers.ts"],
		["macCursor", "electron/native-bridge/cursor/recording/macNativeCursorRecordingSession.ts"],
		["windowsCursor", "electron/native-bridge/cursor/recording/windowsNativeRecordingSession.ts"],
	] as const)("wires the %s identity into its runtime consumer", (identityKey, relativePath) => {
		const consumer = fs.readFileSync(path.resolve(relativePath), "utf8");
		expect(consumer).toContain(`HELPER_IDENTITIES.${identityKey}`);
		expect(consumer).toContain("orderedHelperCandidates(identity, process.env");
	});
});
