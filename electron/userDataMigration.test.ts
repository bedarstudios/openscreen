import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareShowhowUserData } from "./userDataMigration";

const roots: string[] = [];
const makeRoot = () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "showhow-profile-"));
	roots.push(root);
	return root;
};

function expectTokensInOrder(source: string, tokens: string[]) {
	const indexes = tokens.map((token) => source.indexOf(token));
	for (const [index, token] of tokens.entries()) {
		expect(indexes[index], `missing source token: ${token}`).toBeGreaterThanOrEqual(0);
	}
	for (let index = 1; index < indexes.length; index += 1) {
		expect(indexes[index - 1]).toBeLessThan(indexes[index]);
	}
}

afterEach(() => {
	vi.restoreAllMocks();
	for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("prepareShowhowUserData", () => {
	it("boots through the profile selector before importing the main graph", () => {
		const repositoryRoot = path.join(import.meta.dirname, "..");
		const bootstrap = fs.readFileSync(path.join(import.meta.dirname, "bootstrap.ts"), "utf8");
		const main = fs.readFileSync(path.join(import.meta.dirname, "main.ts"), "utf8");
		const viteConfig = fs.readFileSync(path.join(repositoryRoot, "vite.config.ts"), "utf8");
		expect(viteConfig).toContain('entry: "electron/bootstrap.ts"');
		expectTokensInOrder(bootstrap, [
			'app.setName("Showhow")',
			'app.getPath("appData")',
			'app.setPath("userData", selection.path)',
			'await import("./main")',
		]);
		expect(main).not.toContain("app.setName(");
		expect(main).not.toContain('app.setPath("userData"');
	});

	it("rejects a missing bootstrap ordering token", () => {
		expect(() => expectTokensInOrder("first then third", ["first", "second", "third"])).toThrow(
			"missing source token: second",
		);
	});

	it("selects the Showhow path when no profile exists", () => {
		const root = makeRoot();
		expect(prepareShowhowUserData(root)).toEqual({
			path: path.join(root, "Showhow"),
			migratedFrom: null,
			usedLegacyFallback: false,
		});
	});

	it.each(["Openscreen", "OpenScreen", "openscreen"])("copies legacy candidate %s", (name) => {
		const root = makeRoot();
		const legacy = path.join(root, name);
		fs.mkdirSync(path.join(legacy, "nested"), { recursive: true });
		fs.writeFileSync(path.join(legacy, "nested", "Preferences"), name);

		const result = prepareShowhowUserData(root);
		const selectedLegacy = ["Openscreen", "OpenScreen", "openscreen"]
			.map((candidate) => path.join(root, candidate))
			.find((candidate) => fs.existsSync(candidate));

		expect(result).toEqual({
			path: path.join(root, "Showhow"),
			migratedFrom: selectedLegacy,
			usedLegacyFallback: false,
		});
		expect(fs.readFileSync(path.join(result.path, "nested", "Preferences"), "utf8")).toBe(name);
		expect(fs.readFileSync(path.join(legacy, "nested", "Preferences"), "utf8")).toBe(name);
	});

	it("uses the documented legacy candidate order", () => {
		const root = makeRoot();
		fs.mkdirSync(path.join(root, "case-probe"));
		const isCaseSensitive = !fs.existsSync(path.join(root, "CASE-PROBE"));
		fs.rmSync(path.join(root, "case-probe"), { recursive: true });
		if (!isCaseSensitive) return;
		for (const name of ["openscreen", "OpenScreen", "Openscreen"]) {
			fs.mkdirSync(path.join(root, name));
			fs.writeFileSync(path.join(root, name, "source"), name);
		}
		prepareShowhowUserData(root);
		expect(fs.readFileSync(path.join(root, "Showhow", "source"), "utf8")).toBe("Openscreen");
	});

	it("never overwrites an existing Showhow profile", () => {
		const root = makeRoot();
		fs.mkdirSync(path.join(root, "Showhow"));
		fs.writeFileSync(path.join(root, "Showhow", "Preferences"), "current");
		fs.mkdirSync(path.join(root, "Openscreen"));
		fs.writeFileSync(path.join(root, "Openscreen", "Preferences"), "legacy");

		expect(prepareShowhowUserData(root)).toEqual({
			path: path.join(root, "Showhow"),
			migratedFrom: null,
			usedLegacyFallback: false,
		});
		expect(fs.readFileSync(path.join(root, "Showhow", "Preferences"), "utf8")).toBe("current");
	});

	it("cleans failed migration state and falls back to the legacy profile", () => {
		const root = makeRoot();
		const legacy = path.join(root, "Openscreen");
		fs.mkdirSync(legacy);
		fs.writeFileSync(path.join(legacy, "Preferences"), "legacy");
		vi.spyOn(fs, "cpSync").mockImplementation((source, destination, options) => {
			fs.mkdirSync(destination as fs.PathLike, { recursive: true });
			fs.writeFileSync(path.join(destination.toString(), "partial"), "bad");
			throw new Error("copy failed");
		});

		const result = prepareShowhowUserData(root);

		expect(result).toEqual({ path: legacy, migratedFrom: null, usedLegacyFallback: true });
		expect(fs.existsSync(path.join(root, "Showhow"))).toBe(false);
		expect(fs.readFileSync(path.join(legacy, "Preferences"), "utf8")).toBe("legacy");
	});
});
