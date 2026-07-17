import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function parseJson5(relativePath) {
	const source = read(relativePath)
		.replace(/^\s*\/\/.*$/gm, "")
		.replace(/,\s*([}\]])/g, "$1");
	return JSON.parse(source);
}

describe("standalone package identity", () => {
	test("publishes canonical npm and repository metadata", () => {
		const manifest = JSON.parse(read("package.json"));
		expect(manifest.name).toBe("showhow-desktop");
		expect(manifest.productName).toBeUndefined();
		expect(manifest.author).toEqual({
			name: "Bedar Studios",
			url: "https://github.com/bedarstudios",
		});
		expect(manifest.maintainers).toEqual([
			{ name: "Bedar Studios", url: "https://github.com/bedarstudios" },
		]);
		expect(manifest.repository).toEqual({
			type: "git",
			url: "git+https://github.com/bedarstudios/showhow-desktop.git",
		});
		expect(manifest.homepage).toBe("https://github.com/bedarstudios/showhow-desktop#readme");
		expect(manifest.bugs).toEqual({
			url: "https://github.com/bedarstudios/showhow-desktop/issues",
		});
		expect(manifest.scripts["capture:showhow-preview"]).toBe(
			"node scripts/capture-showhow-preview.mjs",
		);
		expect(manifest.scripts["capture:openscreen-preview"]).toBeUndefined();
	});

	test("configures canonical Electron identity and release filenames", () => {
		const builder = parseJson5("electron-builder.json5");
		expect(builder.appId).toBe("com.bedarstudios.showhow");
		expect(builder.productName).toBe("Showhow");
		expect(builder.mac.artifactName).toBe(
			"showhow-desktop-Mac-${arch}-${version}-Installer.${ext}",
		);
		expect(builder.linux.artifactName).toBe("showhow-desktop-Linux-${version}.${ext}");
		expect(builder.win.artifactName).toBe("showhow-desktop.Setup.${version}.${ext}");
		expect(builder.linux.maintainer).toBe("Bedar Studios");
		for (const description of Object.values(builder.mac.extendInfo).filter(
			(value) => typeof value === "string",
		)) {
			expect(description).toContain("Showhow");
			expect(description).not.toMatch(/openscreen/i);
		}
	});

	test("keeps macOS entitlements required by Showhow capture", () => {
		const entitlements = read("macos.entitlements");
		for (const entitlement of [
			"com.apple.security.device.audio-input",
			"com.apple.security.device.camera",
			"com.apple.security.device.screen-capture",
		]) {
			expect(entitlements).toContain(`<key>${entitlement}</key>`);
		}
		expect(entitlements).not.toMatch(/openscreen/i);
	});

	test("exposes only canonical Showhow Nix package and module names", () => {
		for (const file of ["flake.nix", "nix/package.nix", "nix/module.nix", "nix/hm-module.nix"]) {
			const source = read(file);
			expect(source).toContain("showhow-desktop");
			expect(source).not.toMatch(/openscreen/i);
		}
		const packageSource = read("nix/package.nix");
		expect(packageSource).toContain('desktopName = "Showhow"');
		expect(packageSource).toContain('mainProgram = "showhow-desktop"');
	});

	test("uses canonical environment, workflow artifact, and cache identity", () => {
		const envExample = read(".env.example");
		expect(envExample).toContain("APP_NAME=Showhow");
		expect(envExample).toContain("BUNDLE_ID=com.bedarstudios.showhow");
		expect(envExample).toContain("NOTARY_PROFILE=Showhow-notary");
		expect(envExample).toContain(
			'SIGN_IDENTITY="Developer ID Application: Bedar Studios (TEAM_ID)"',
		);
		expect(envExample).toContain('CSC_NAME="Developer ID Application: Bedar Studios (TEAM_ID)"');
		expect(envExample).not.toMatch(/openscreen/i);

		const setup = read(".github/actions/setup/action.yml");
		expect(setup).toContain("Setup Showhow Node.js");
		expect(setup).toContain("cache-dependency-path: package-lock.json");

		const workflow = read(".github/workflows/build.yml");
		for (const artifact of [
			"showhow-desktop-windows",
			"showhow-desktop-mac-${{ matrix.arch }}",
			"showhow-desktop-linux",
		]) {
			expect(workflow).toContain(`name: ${artifact}`);
		}
		expect(workflow).toContain("SHOWHOW_MAC_HELPER_ARCHS: ${{ matrix.arch }}");
		expect(workflow).toContain('DMG_NAME="showhow-desktop-Mac-${ARCH}-${VERSION}-Installer.dmg"');
		expect(workflow).not.toMatch(/name:\s*openscreen-/i);
		expect(workflow).toContain("secrets.SHOWHOW_RELEASE_TOKEN || secrets.OPENSCREEN_RELEASE_TOKEN");
		expect(workflow.match(/openscreen/gi)).toEqual(["OPENSCREEN"]);
		expect(workflow.match(/OPENSCREEN_[A-Z_]+/g)).toEqual(["OPENSCREEN_RELEASE_TOKEN"]);
	});

	test("limits the helper build allowlist to one Showhow-first legacy variable fallback", () => {
		const source = read("scripts/build-macos-screencapturekit-helper.mjs");
		const current = "process.env.SHOWHOW_MAC_HELPER_ARCHS ??";
		const legacy = "process.env.OPENSCREEN_MAC_HELPER_ARCHS ??";
		expect(source.indexOf(current)).toBeGreaterThan(-1);
		expect(source.indexOf(legacy)).toBeGreaterThan(source.indexOf(current));
		expect(source.match(/OPENSCREEN_MAC_HELPER_ARCHS/g)).toHaveLength(2);
		expect(source.match(/openscreen/gi)).toEqual(["OPENSCREEN", "OPENSCREEN"]);
	});

	test("uses Showhow-first preview names with read-only legacy fallbacks", () => {
		expect(fs.existsSync(path.join(ROOT, "scripts/capture-showhow-preview.mjs"))).toBe(true);
		expect(fs.existsSync(path.join(ROOT, "scripts/capture-openscreen-preview.mjs"))).toBe(false);
		const source = read("scripts/capture-showhow-preview.mjs");
		for (const variable of ["OUTPUT_DIR", "FRAME_COUNT", "FPS", "SKIP_BUILD"]) {
			const current = `SHOWHOW_PREVIEW_${variable}`;
			const legacy = `OPENSCREEN_PREVIEW_${variable}`;
			expect(source.indexOf(current)).toBeGreaterThan(-1);
			expect(source.indexOf(legacy)).toBeGreaterThan(source.indexOf(current));
		}
		expect(source.match(/OPENSCREEN_PREVIEW_[A-Z_]+/g)).toEqual([
			"OPENSCREEN_PREVIEW_OUTPUT_DIR",
			"OPENSCREEN_PREVIEW_FRAME_COUNT",
			"OPENSCREEN_PREVIEW_FPS",
			"OPENSCREEN_PREVIEW_SKIP_BUILD",
		]);
		expect(source.match(/openscreen/gi)).toEqual([
			"OPENSCREEN",
			"OPENSCREEN",
			"OPENSCREEN",
			"openscreen",
			"OPENSCREEN",
		]);
		expect(source).toContain('entry.name.startsWith("openscreen-cursor-native-")');
		expect(source).toContain("showhow-real-preview-");
		expect(source).toContain("showhow-preview-fixture.webm");
		expect(source).toContain("showhow-preview.webm");
		expect(source).toContain("Timed out waiting for Showhow IPC handlers.");
	});

	test("documents canonical output names in the standalone macOS build script", () => {
		const source = read("scripts/build_macos.sh");
		expect(source).toContain("Showhow macOS Build Script");
		expect(source).toContain("showhow-desktop-Mac-<arch>-<version>-Installer.dmg");
		expect(source).not.toMatch(/openscreen/i);
	});

	test("identifies model downloads as Showhow packaging traffic", () => {
		const source = read("scripts/fetch-caption-model.mjs");
		expect(source).toContain('"user-agent": "showhow-desktop-build"');
		expect(source).not.toMatch(/openscreen-build/i);
	});
});
