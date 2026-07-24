// electron-builder beforePack hook: build the target platform's native capture helpers and ensure
// the auto-caption assets exist before extraResources are copied. Runs on every package invocation
// (local `npm run build:*` and CI's bare `electron-builder`).

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { Arch } = require("builder-util");

const root = path.join(__dirname, "..");

function createBeforePack(run = execFileSync) {
	return async function beforePack({ electronPlatformName, arch }) {
		if (electronPlatformName === "darwin") {
			const targetArch = Arch[arch];
			if (targetArch !== "x64" && targetArch !== "arm64") {
				throw new Error(`Unsupported macOS helper architecture: ${targetArch ?? arch}`);
			}
			run("node", [path.join(__dirname, "build-macos-screencapturekit-helper.mjs")], {
				stdio: "inherit",
				cwd: root,
				env: { ...process.env, SHOWHOW_MAC_HELPER_ARCHS: targetArch },
			});
		} else if (electronPlatformName === "win32") {
			run("node", [path.join(__dirname, "build-windows-wgc-helper.mjs")], {
				stdio: "inherit",
				cwd: root,
			});
		}

		run("node", [path.join(__dirname, "fetch-caption-model.mjs")], {
			stdio: "inherit",
			cwd: root,
		});
	};
}

exports.createBeforePack = createBeforePack;
exports.default = createBeforePack();
