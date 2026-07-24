import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generator = path.join(repoRoot, "scripts/generate-app-icons.mjs");
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const deterministicFiles = [
	...sizes.map((size) => `icons/icons/png/${size}x${size}.png`),
	"icons/icons/win/icon.ico",
	"icons/icons/mac/icon.icns",
	"public/showhow.png",
];

const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const expectedIcnsTypes = [
	"ic04",
	"ic05",
	"ic07",
	"ic08",
	"ic09",
	"ic10",
	"ic11",
	"ic12",
	"ic13",
	"ic14",
];
const pngIcnsPixels = new Map([
	["ic11", 32],
	["ic12", 64],
	["ic07", 128],
	["ic13", 256],
	["ic08", 256],
	["ic14", 512],
	["ic09", 512],
	["ic10", 1024],
]);

function validateIco(buffer) {
	if (buffer.length < 6) throw new Error("ICO header is truncated");
	if (buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) {
		throw new Error("Invalid ICO header");
	}
	const count = buffer.readUInt16LE(4);
	if (count !== 7) throw new Error(`Expected 7 ICO entries, received ${count}`);
	const directoryEnd = 6 + count * 16;
	if (directoryEnd > buffer.length) throw new Error("ICO directory is truncated");
	const sizes = [];
	for (let index = 0; index < count; index += 1) {
		const entry = 6 + index * 16;
		const width = buffer[entry] || 256;
		const height = buffer[entry + 1] || 256;
		const planes = buffer.readUInt16LE(entry + 4);
		const bitsPerPixel = buffer.readUInt16LE(entry + 6);
		const byteLength = buffer.readUInt32LE(entry + 8);
		const offset = buffer.readUInt32LE(entry + 12);
		if (width !== height || planes !== 1 || bitsPerPixel !== 32) {
			throw new Error(`Invalid ICO entry metadata at index ${index}`);
		}
		if (byteLength === 0 || offset < directoryEnd || byteLength > buffer.length - offset) {
			throw new Error(`Invalid ICO entry bounds at index ${index}`);
		}
		const payload = buffer.subarray(offset, offset + byteLength);
		if (!payload.subarray(0, pngSignature.length).equals(pngSignature)) {
			const maskRowBytes = Math.ceil(width / 32) * 4;
			const expectedDibBytes = 40 + width * height * 4 + maskRowBytes * height;
			if (
				payload.length !== expectedDibBytes ||
				payload.readUInt32LE(0) !== 40 ||
				payload.readInt32LE(4) !== width ||
				payload.readInt32LE(8) !== height * 2 ||
				payload.readUInt16LE(12) !== 1 ||
				payload.readUInt16LE(14) !== 32 ||
				payload.readUInt32LE(16) !== 0
			) {
				throw new Error(`ICO entry ${index} has an invalid DIB payload`);
			}
		}
		sizes.push(width);
	}
	if (new Set(sizes).size !== sizes.length) throw new Error("ICO sizes must be unique");
	return { sizes: sizes.toSorted((left, right) => left - right) };
}

function validateIcns(buffer) {
	if (buffer.length < 8) throw new Error("ICNS header is truncated");
	if (buffer.subarray(0, 4).toString("ascii") !== "icns") throw new Error("Invalid ICNS magic");
	if (buffer.readUInt32BE(4) !== buffer.length) throw new Error("Invalid ICNS declared length");
	const types = [];
	let offset = 8;
	while (offset < buffer.length) {
		if (buffer.length - offset < 8) throw new Error("ICNS chunk header is truncated");
		const type = buffer.subarray(offset, offset + 4).toString("ascii");
		if (!/^[\x20-\x7e]{4}$/.test(type)) throw new Error("Invalid ICNS chunk type");
		const byteLength = buffer.readUInt32BE(offset + 4);
		if (byteLength < 8 || byteLength > buffer.length - offset) {
			throw new Error(`Invalid ICNS ${type} chunk bounds`);
		}
		if (types.includes(type)) throw new Error(`Duplicate ICNS ${type} chunk`);
		const payload = buffer.subarray(offset + 8, offset + byteLength);
		const pixels = pngIcnsPixels.get(type);
		if (pixels !== undefined) {
			if (!payload.subarray(0, pngSignature.length).equals(pngSignature)) {
				throw new Error(`Invalid ICNS ${type} PNG signature`);
			}
			if (
				payload.length < 33 ||
				payload.readUInt32BE(8) !== 13 ||
				payload.subarray(12, 16).toString("ascii") !== "IHDR" ||
				payload.readUInt32BE(16) !== pixels ||
				payload.readUInt32BE(20) !== pixels
			) {
				throw new Error(`Invalid ICNS ${type} PNG dimensions or IHDR`);
			}
		} else if (type === "ic04" || type === "ic05") {
			if (payload.length < 16 || payload.subarray(0, 4).toString("ascii") !== "ARGB") {
				throw new Error(`Invalid ICNS ${type} ARGB marker or truncated payload`);
			}
			if (!payload.subarray(4).some((byte) => byte !== 0)) {
				throw new Error(`Invalid ICNS ${type} nontrivial ARGB payload`);
			}
		}
		types.push(type);
		offset += byteLength;
	}
	if (offset !== buffer.length) throw new Error("ICNS chunks do not end at EOF");
	const missing = expectedIcnsTypes.filter((type) => !types.includes(type));
	if (missing.length > 0) throw new Error(`Missing ICNS representations: ${missing.join(", ")}`);
	return { types: types.filter((type) => expectedIcnsTypes.includes(type)).toSorted() };
}

function icnsPayloadOffset(buffer, wantedType) {
	let offset = 8;
	while (offset < buffer.length) {
		const type = buffer.subarray(offset, offset + 4).toString("ascii");
		if (type === wantedType) return offset + 8;
		offset += buffer.readUInt32BE(offset + 4);
	}
	throw new Error(`Missing ${wantedType}`);
}

function makeRoot() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "showhow-icons-"));
	fs.mkdirSync(path.join(root, "docs/design/brand"), { recursive: true });
	fs.copyFileSync(
		path.join(repoRoot, "docs/design/brand/showhow-app-icon.svg"),
		path.join(root, "docs/design/brand/showhow-app-icon.svg"),
	);
	return root;
}

function generate(root, extraEnv = {}) {
	execFileSync(process.execPath, [generator], {
		cwd: repoRoot,
		env: { ...process.env, SHOWHOW_ICON_ROOT: root, ...extraEnv },
		stdio: "pipe",
	});
}

describe("Showhow icon generation", () => {
	it("declares the deterministic generator and direct dependencies", () => {
		const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
		expect(packageJson.scripts["icons:generate"]).toBe("node scripts/generate-app-icons.mjs");
		expect(packageJson.devDependencies.sharp).toBeTruthy();
		expect(packageJson.devDependencies["png-to-ico"]).toBeTruthy();
		expect(fs.existsSync(generator)).toBe(true);
	});

	it("contains every required derivative and no inherited starter marks", async () => {
		for (const file of deterministicFiles) {
			const absolute = path.join(repoRoot, file);
			expect(fs.existsSync(absolute), file).toBe(true);
			expect(fs.statSync(absolute).size, file).toBeGreaterThan(0);
		}
		for (const obsolete of ["public/openscreen.png", "public/vite.svg", "src/assets/react.svg"]) {
			expect(fs.existsSync(path.join(repoRoot, obsolete)), obsolete).toBe(false);
		}

		for (const size of sizes) {
			const metadata = await sharp(
				path.join(repoRoot, `icons/icons/png/${size}x${size}.png`),
			).metadata();
			expect({ width: metadata.width, height: metadata.height, format: metadata.format }).toEqual({
				width: size,
				height: size,
				format: "png",
			});
		}
		expect((await sharp(path.join(repoRoot, "public/showhow.png")).metadata()).width).toBe(512);
		expect(fs.readFileSync(path.join(repoRoot, "icons/icons/win/icon.ico")).subarray(0, 4)).toEqual(
			Buffer.from([0, 0, 1, 0]),
		);
		expect(
			fs
				.readFileSync(path.join(repoRoot, "icons/icons/mac/icon.icns"))
				.subarray(0, 4)
				.toString("ascii"),
		).toBe("icns");
	});

	it("validates the complete portable ICO and ICNS container manifests", () => {
		const ico = validateIco(fs.readFileSync(path.join(repoRoot, "icons/icons/win/icon.ico")));
		expect(ico.sizes).toEqual([16, 24, 32, 48, 64, 128, 256]);
		const icns = validateIcns(fs.readFileSync(path.join(repoRoot, "icons/icons/mac/icon.icns")));
		expect(icns.types).toEqual([
			"ic04",
			"ic05",
			"ic07",
			"ic08",
			"ic09",
			"ic10",
			"ic11",
			"ic12",
			"ic13",
			"ic14",
		]);
	});

	it("rejects truncated or fake icon containers", () => {
		const ico = fs.readFileSync(path.join(repoRoot, "icons/icons/win/icon.ico"));
		const icns = fs.readFileSync(path.join(repoRoot, "icons/icons/mac/icon.icns"));
		expect(() => validateIco(ico.subarray(0, 12))).toThrow();
		expect(() => validateIco(Buffer.from([0, 0, 1, 0, 0, 0]))).toThrow();
		const corruptIco = Buffer.from(ico);
		corruptIco.writeUInt32LE(corruptIco.length - 2, 6 + 12);
		expect(() => validateIco(corruptIco)).toThrow("bounds");
		expect(() => validateIcns(icns.subarray(0, icns.length - 1))).toThrow();
		expect(() => validateIcns(Buffer.from("icns0000"))).toThrow();
		const corruptIcns = Buffer.from(icns);
		corruptIcns.writeUInt32BE(corruptIcns.length, 12);
		expect(() => validateIcns(corruptIcns)).toThrow("chunk bounds");

		const wrongPngSignature = Buffer.from(icns);
		wrongPngSignature[icnsPayloadOffset(wrongPngSignature, "ic11")] = 0;
		expect(() => validateIcns(wrongPngSignature)).toThrow("PNG signature");
		const wrongPngDimensions = Buffer.from(icns);
		wrongPngDimensions.writeUInt32BE(31, icnsPayloadOffset(wrongPngDimensions, "ic11") + 16);
		expect(() => validateIcns(wrongPngDimensions)).toThrow("dimensions");
		const wrongLegacyMarker = Buffer.from(icns);
		wrongLegacyMarker.write("XRGB", icnsPayloadOffset(wrongLegacyMarker, "ic04"), "ascii");
		expect(() => validateIcns(wrongLegacyMarker)).toThrow("ARGB marker");
		const emptyLegacyPayload = Buffer.from(icns);
		const legacyOffset = icnsPayloadOffset(emptyLegacyPayload, "ic05");
		const legacyLength = emptyLegacyPayload.readUInt32BE(legacyOffset - 4) - 8;
		emptyLegacyPayload.fill(0, legacyOffset + 4, legacyOffset + legacyLength);
		expect(() => validateIcns(emptyLegacyPayload)).toThrow("nontrivial");
	});

	it.runIf(process.platform === "darwin")(
		"is deterministic and responds to the canonical SVG",
		() => {
			const root = makeRoot();
			generate(root);
			const first = Object.fromEntries(
				deterministicFiles.map((file) => [file, hash(path.join(root, file))]),
			);
			generate(root);
			const second = Object.fromEntries(
				deterministicFiles.map((file) => [file, hash(path.join(root, file))]),
			);
			expect(second).toEqual(first);

			const source = path.join(root, "docs/design/brand/showhow-app-icon.svg");
			fs.writeFileSync(source, fs.readFileSync(source, "utf8").replace("#6BFF7E", "#6AFF7D"));
			generate(root);
			expect(hash(path.join(root, "icons/icons/png/1024x1024.png"))).not.toBe(
				first["icons/icons/png/1024x1024.png"],
			);
		},
	);

	it("fails clearly instead of retaining a stale ICNS when iconutil is unavailable", () => {
		const root = makeRoot();
		const icns = path.join(root, "icons/icons/mac/icon.icns");
		fs.mkdirSync(path.dirname(icns), { recursive: true });
		fs.writeFileSync(icns, "stale");
		const result = spawnSync(process.execPath, [generator], {
			cwd: repoRoot,
			env: { ...process.env, SHOWHOW_ICON_ROOT: root, SHOWHOW_ICON_PLATFORM: "linux" },
			encoding: "utf8",
		});
		expect(result.status).not.toBe(0);
		expect(`${result.stdout}${result.stderr}`).toContain("macOS iconutil is required");
		expect(fs.existsSync(icns)).toBe(false);
	});
});
