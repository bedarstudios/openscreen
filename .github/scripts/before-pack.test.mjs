import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";

const require = createRequire(import.meta.url);
const { createBeforePack } = require("../../scripts/before-pack.cjs");
const root = path.resolve(import.meta.dirname, "../..");

describe("beforePack", () => {
	test.each([
		["darwin", 1, "build-macos-screencapturekit-helper.mjs", "x64"],
		["darwin", 3, "build-macos-screencapturekit-helper.mjs", "arm64"],
		["win32", 1, "build-windows-wgc-helper.mjs", undefined],
	])("builds %s native helpers before packaging", async (platform, arch, script, macArch) => {
		const run = vi.fn();

		await createBeforePack(run)({ electronPlatformName: platform, arch });

		expect(run).toHaveBeenCalledWith(
			"node",
			[path.join(root, "scripts", script)],
			expect.objectContaining({
				cwd: root,
				stdio: "inherit",
				...(macArch ? { env: expect.objectContaining({ SHOWHOW_MAC_HELPER_ARCHS: macArch }) } : {}),
			}),
		);
	});

	test("does not build native helpers for Linux packages", async () => {
		const run = vi.fn();

		await createBeforePack(run)({ electronPlatformName: "linux", arch: 1 });

		expect(
			run.mock.calls.some(([, [script]]) => script.includes("build-") && script.includes("helper")),
		).toBe(false);
	});
});
