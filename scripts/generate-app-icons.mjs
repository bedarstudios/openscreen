import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(process.env.SHOWHOW_ICON_ROOT ?? scriptRoot);
const platform = process.env.SHOWHOW_ICON_PLATFORM ?? process.platform;
const source = path.join(root, "docs/design/brand/showhow-app-icon.svg");
const pngDirectory = path.join(root, "icons/icons/png");
const macDirectory = path.join(root, "icons/icons/mac");
const windowsDirectory = path.join(root, "icons/icons/win");
const publicDirectory = path.join(root, "public");
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

if (!fs.existsSync(source)) {
	throw new Error(`Canonical Showhow icon is missing: ${source}`);
}

for (const directory of [pngDirectory, macDirectory, windowsDirectory, publicDirectory]) {
	fs.mkdirSync(directory, { recursive: true });
}

const icnsFile = path.join(macDirectory, "icon.icns");
fs.rmSync(icnsFile, { force: true });
if (platform !== "darwin") {
	throw new Error("macOS iconutil is required to regenerate icons/icons/mac/icon.icns");
}

const svg = fs.readFileSync(source);
for (const size of sizes) {
	await sharp(svg, { density: 384 })
		.resize(size, size, { fit: "fill" })
		.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
		.toFile(path.join(pngDirectory, `${size}x${size}.png`));
}

await sharp(svg, { density: 384 })
	.resize(512, 512, { fit: "fill" })
	.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
	.toFile(path.join(publicDirectory, "showhow.png"));

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const ico = await pngToIco(icoSizes.map((size) => path.join(pngDirectory, `${size}x${size}.png`)));
fs.writeFileSync(path.join(windowsDirectory, "icon.ico"), ico);

const iconset = path.join(macDirectory, "showhow.iconset");
fs.rmSync(iconset, { recursive: true, force: true });
fs.mkdirSync(iconset, { recursive: true });
for (const [name, size] of [
	["icon_16x16.png", 16],
	["icon_16x16@2x.png", 32],
	["icon_32x32.png", 32],
	["icon_32x32@2x.png", 64],
	["icon_128x128.png", 128],
	["icon_128x128@2x.png", 256],
	["icon_256x256.png", 256],
	["icon_256x256@2x.png", 512],
	["icon_512x512.png", 512],
	["icon_512x512@2x.png", 1024],
]) {
	fs.copyFileSync(path.join(pngDirectory, `${size}x${size}.png`), path.join(iconset, name));
}

try {
	execFileSync("iconutil", ["--convert", "icns", "--output", icnsFile, iconset], {
		stdio: "pipe",
	});
} finally {
	fs.rmSync(iconset, { recursive: true, force: true });
}

for (const obsolete of ["public/openscreen.png", "public/vite.svg", "src/assets/react.svg"]) {
	fs.rmSync(path.join(root, obsolete), { force: true });
}

console.log(`Generated Showhow application icons from ${path.relative(root, source)}`);
