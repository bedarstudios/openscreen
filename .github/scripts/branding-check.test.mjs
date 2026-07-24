import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { scanBrandingReferences } from "../../scripts/branding-check.mjs";

const execFileAsync = promisify(execFile);
const LEGACY_BRAND = ["Open", "Screen"].join("");

async function trackedFixture(file, contents) {
	const root = await mkdtemp(path.join(os.tmpdir(), "showhow-branding-"));
	await execFileAsync("git", ["init"], { cwd: root });
	await writeFile(path.join(root, file), contents);
	await execFileAsync("git", ["add", file], { cwd: root });
	return root;
}

describe("branding reference policy", () => {
	it("rejects an unclassified active legacy reference", async () => {
		const root = await trackedFixture("README.md", `${LEGACY_BRAND} is the product`);
		await expect(scanBrandingReferences(root, { allowed: [] })).resolves.toEqual([
			expect.objectContaining({ file: "README.md", line: 1 }),
		]);
	});

	it("accepts an exact attributed legacy reference", async () => {
		const root = await trackedFixture("NOTICE.md", `Derived from ${LEGACY_BRAND} under MIT`);
		await expect(
			scanBrandingReferences(root, {
				allowed: [{ file: "NOTICE.md", reason: "MIT source attribution" }],
			}),
		).resolves.toEqual([]);
	});

	it("does not report the enforcement machinery itself", async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), "showhow-branding-"));
		const files = [
			"scripts/branding-check.mjs",
			".github/scripts/branding-check.test.mjs",
			"config/branding-allowlist.json",
		];
		for (const file of files) {
			await mkdir(path.dirname(path.join(root, file)), { recursive: true });
			await writeFile(path.join(root, file), await readFile(path.join(process.cwd(), file)));
		}
		await execFileAsync("git", ["init"], { cwd: root });
		await execFileAsync("git", ["add", ...files], { cwd: root });

		await expect(scanBrandingReferences(root, { allowed: [] })).resolves.toEqual([]);
	});
});
