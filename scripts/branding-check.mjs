import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BRAND_RE = new RegExp(
	[
		["open", "screen"].join(""),
		["open", " screen"].join(""),
		["get", "open", "screen"].join(""),
	].join("|"),
	"gi",
);

export async function scanBrandingReferences(rootDir, policy) {
	const allowed = new Set(policy.allowed.map((entry) => entry.file));
	const { stdout } = await execFileAsync("git", ["ls-files"], { cwd: rootDir });
	const matches = [];
	for (const file of stdout.split("\n").filter(Boolean)) {
		if (allowed.has(file) || file === "package-lock.json") continue;
		BRAND_RE.lastIndex = 0;
		if (BRAND_RE.test(file)) matches.push({ file, line: 0, text: "legacy name in path" });
		const contents = await fs.readFile(path.join(rootDir, file), "utf8").catch(() => null);
		if (contents === null) continue;
		for (const [index, line] of contents.split("\n").entries()) {
			BRAND_RE.lastIndex = 0;
			if (BRAND_RE.test(line)) matches.push({ file, line: index + 1, text: line.trim() });
		}
	}
	return matches;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const root = process.cwd();
	const policy = JSON.parse(await fs.readFile(path.join(root, "config/branding-allowlist.json")));
	const matches = await scanBrandingReferences(root, policy);
	if (matches.length) {
		for (const match of matches) console.error(`${match.file}:${match.line} ${match.text}`);
		process.exitCode = 1;
	} else {
		console.log("Branding check passed: all legacy-brand references are classified.");
	}
}
