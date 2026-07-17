import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("packaged Electron entry", () => {
	it("emits the bootstrap at the package main path", () => {
		const repositoryRoot = path.join(import.meta.dirname, "..");
		const packageJson = JSON.parse(
			fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
		) as { main: string };
		const viteConfig = fs.readFileSync(path.join(repositoryRoot, "vite.config.ts"), "utf8");

		expect(packageJson.main).toBe("dist-electron/main.js");
		expect(viteConfig).toContain('entry: "electron/bootstrap.ts"');
		expect(viteConfig).toContain('entryFileNames: "main.js"');
	});
});
