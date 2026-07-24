# Showhow Repository Identity Implementation Plan

> **Status: completed — 2026-07-24.** Executed on branch `codex/showhow-standalone` and merged in PR #29. The branding policy and
> scanner it specifies are live: `config/branding-allowlist.json` and `npm run branding:check`,
> wired into `ci.yml`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make active repository documentation and automation describe Showhow, and install an
enforced classification policy for every remaining OpenScreen reference.

**Architecture:** A versioned JSON policy classifies allowed legacy references by exact file and
reason. A Node scanner fails on any unclassified match. Active root, GitHub, harness, and
engineering documentation are then rewritten against the approved Showhow product spec.

**Tech Stack:** Node.js 22, Vitest, JSON, Markdown, GitHub Actions.

## Global Constraints

- Preserve `LICENSE` verbatim.
- Historical dated specs/plans may retain accurate OpenScreen references.
- Active guidance must not instruct contributors to merge or synchronize with OpenScreen.
- Do not touch runtime identifiers in this plan.

---

### Task 1: Add the branding-reference policy and scanner

**Files:**
- Create: `config/branding-allowlist.json`
- Create: `scripts/branding-check.mjs`
- Create: `.github/scripts/branding-check.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `scanBrandingReferences(rootDir, policy): BrandingMatch[]`
- Produces: `npm run branding:check`, returning non-zero for unclassified matches.

- [ ] **Step 1: Write the failing scanner tests**

```js
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { scanBrandingReferences } from "../../scripts/branding-check.mjs";

const execFileAsync = promisify(execFile);

async function trackedFixture(file, contents) {
	const root = await mkdtemp(path.join(os.tmpdir(), "showhow-branding-"));
	await execFileAsync("git", ["init"], { cwd: root });
	await writeFile(path.join(root, file), contents);
	await execFileAsync("git", ["add", file], { cwd: root });
	return root;
}

describe("branding reference policy", () => {
	it("rejects an unclassified active OpenScreen reference", async () => {
		const root = await trackedFixture("README.md", "OpenScreen is the product");
		await expect(scanBrandingReferences(root, { allowed: [] })).resolves.toEqual([
			expect.objectContaining({ file: "README.md", line: 1 }),
		]);
	});

	it("accepts an exact attributed legacy reference", async () => {
		const root = await trackedFixture("NOTICE.md", "Derived from OpenScreen under MIT");
		await expect(
			scanBrandingReferences(root, {
				allowed: [{ file: "NOTICE.md", reason: "MIT source attribution" }],
			}),
		).resolves.toEqual([]);
	});
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run .github/scripts/branding-check.test.mjs`

Expected: FAIL because `scripts/branding-check.mjs` does not exist.

- [ ] **Step 3: Implement the scanner**

```js
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const BRAND_RE = /openscreen|open screen|getopenscreen/gi;

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
		console.log("Branding check passed: all OpenScreen references are classified.");
	}
}
```

- [ ] **Step 4: Seed the policy with historical/attribution files only**

Create `config/branding-allowlist.json` with this schema and enumerate every dated historical file
that remains intentionally unchanged:

```json
{
	"allowed": [
		{ "file": "LICENSE", "reason": "Required MIT copyright notice" },
		{
			"file": "docs/superpowers/specs/2026-07-11-showhow-desktop-design.md",
			"reason": "Dated record of the original fork decision"
		},
		{
			"file": "docs/superpowers/specs/2026-07-16-showhow-standalone-repository-design.md",
			"reason": "Approved migration design and compatibility policy"
		}
	]
}
```

Do not allowlist active source or active operational docs merely to make the command pass.

- [ ] **Step 5: Wire the command into package scripts and CI**

Add `"branding:check": "node scripts/branding-check.mjs"` to `package.json`. Add
`npm run branding:check` after `npm run lint` in the CI lint job.

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run .github/scripts/branding-check.test.mjs`

Expected: PASS, 2 tests.

Run: `npm run branding:check`

Expected: FAIL and print the current unclassified inventory; this is the red baseline consumed by
Tasks 2-4.

```bash
git add config/branding-allowlist.json scripts/branding-check.mjs \
  .github/scripts/branding-check.test.mjs package.json package-lock.json .github/workflows/ci.yml
git commit -m "test: enforce Showhow branding policy"
```

### Task 2: Replace the root product documentation

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `AGENTS.md`
- Modify: `CONTRIBUTING.md`
- Create: `NOTICE.md`
- Create: `UPSTREAM.md`
- Create: `docs/architecture/showhow-bundles.md`
- Delete: `SHOWHOW.md`

**Interfaces:**
- Consumes: approved spec at
  `docs/superpowers/specs/2026-07-16-showhow-standalone-repository-design.md`.
- Produces: one non-conflicting active source of truth for product, roadmap, agent, contribution,
  attribution, and selective-upstream policy.

- [ ] **Step 1: Rewrite `README.md` with these exact sections**

Use `# Showhow`, then `What Showhow does`, `Current status`, `Requirements`, `Development`,
`Verification`, `Repository policy`, `Attribution`, and `License`. Describe the V1 path as
record → folder bundle → workflow doc → copy path. Use only `bedarstudios/showhow-desktop` links.
State that the project is free, MIT, local-first, and pre-1.x/not production-grade.

- [ ] **Step 2: Replace `ROADMAP.md` from approved sources**

Make the source order explicit: approved desktop spec → current feature backlog → roadmap. Use
phases: completed Phase 1 folder bundle; desktop doc engine; library/workflow UI; extension bridge;
polish. Move inherited OpenScreen stability items to an `Inherited technical backlog` subsection
only when they still apply to Showhow.

- [ ] **Step 3: Rewrite agent and contribution guidance**

Keep verified setup/test commands from the current `AGENTS.md`, replace product/release policy with
Showhow, preserve native-code safety warnings, add `.showhow`/legacy `.openscreen` compatibility
constraints, and prohibit full upstream merges. Point `CONTRIBUTING.md` clone/issues/PR examples to
`bedarstudios/showhow-desktop`.

- [ ] **Step 4: Consolidate `SHOWHOW.md`**

Move its save-path and bundle/transcription knowledge into
`docs/architecture/showhow-bundles.md`; preserve the three macOS completion paths and
`<video path>.cursor.json` invariant. Delete `SHOWHOW.md` only after a diff confirms no unique
operational rule was lost.

- [ ] **Step 5: Add attribution and upstream policy**

`NOTICE.md` must retain the original author/repository, MIT derivation, and statement that Showhow
is independent and not an official continuation. `UPSTREAM.md` must contain:

```bash
git remote add openscreen-upstream https://github.com/getopenscreen/openscreen.git
git fetch openscreen-upstream
git log --oneline main..openscreen-upstream/main
# cherry-pick or port one reviewed change, then run required verification
git remote remove openscreen-upstream
```

- [ ] **Step 6: Verify and commit**

Run: `rg -n -i 'community-maintained continuation|merge upstream|upstream sync|EtienneLescot/openscreen' README.md ROADMAP.md AGENTS.md CONTRIBUTING.md UPSTREAM.md NOTICE.md`

Expected: no matches except the intentional OpenScreen source URL in `UPSTREAM.md`/`NOTICE.md`.

```bash
git add README.md ROADMAP.md AGENTS.md CONTRIBUTING.md NOTICE.md UPSTREAM.md \
  docs/architecture/showhow-bundles.md
git rm SHOWHOW.md
git diff --cached --check
git commit -m "docs: establish Showhow repository identity"
```

### Task 3: Align active GitHub and harness operations

**Files:**
- Modify: `.github/copilot-instructions.md`
- Modify: `.github/CODEOWNERS`
- Modify: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Modify: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Modify: `.github/pull_request_template.md`
- Modify: `.github/scripts/discord-roadmap-sync.mjs`
- Modify: `.github/scripts/release-milestone-migrate.mjs`
- Modify: `.github/workflows/build.yml`
- Modify: `.harness/agent.md`
- Modify: `.harness/docs/architecture-overview.md`
- Modify: `.harness/docs/git-workflow.md`
- Modify: `.harness/hooks/post-commit.md`
- Modify: `.harness/hooks/pre-commit.md`
- Rename: `.harness/reins/openscreen-dev/` → `.harness/reins/showhow-dev/`
- Rename: `.harness/reins/openscreen-reviewer/` → `.harness/reins/showhow-reviewer/`
- Rename: `.harness/reins/openscreen-tester/` → `.harness/reins/showhow-tester/`

**Interfaces:**
- Produces: active automation and agent roles that target Showhow only.

- [ ] **Step 1: Update active repository references**

Replace repository URLs, issue links, artifact labels, roadmap names, and agent role names with the
canonical Showhow values. Remove inherited Discord/OpenScreen community assumptions that are not
used by Bedar Studios. Preserve review-glue behavior and semantic-PR requirements.

- [ ] **Step 2: Rename harness reins with Git-aware moves**

```bash
git mv .harness/reins/openscreen-dev .harness/reins/showhow-dev
git mv .harness/reins/openscreen-reviewer .harness/reins/showhow-reviewer
git mv .harness/reins/openscreen-tester .harness/reins/showhow-tester
```

Update all references to the old directories in `.harness` and `.github`.

- [ ] **Step 3: Keep historical memory historical**

Do not rewrite `.harness/memory/MEMORY.md` entries describing past OpenScreen work. Add it to the
branding policy with reason `Append-only historical harness memory`.

- [ ] **Step 4: Verify automation tests and commit**

Run: `npx vitest run .github/scripts`

Expected: PASS.

```bash
git add .github .harness config/branding-allowlist.json
git diff --cached --check
git commit -m "chore: align repository automation with Showhow"
```

### Task 4: Align active engineering documentation and close the documentation inventory

**Files:**
- Modify: `docs/architecture/native-bridge.md`
- Modify: `docs/engineering/macos-native-recorder-roadmap.md`
- Modify: `docs/engineering/windows-native-recorder-roadmap.md`
- Modify: `docs/github-actions-workflows.md`
- Modify: `docs/secrets.md`
- Modify: `docs/testing/macos-native-cursor.md`
- Modify: `docs/testing/windows-native-cursor.md`
- Modify: `electron/native/README.md`
- Modify: `scripts/diagnostic-tool/README.md`
- Modify: `config/branding-allowlist.json`

**Interfaces:**
- Produces: active engineering/native/testing documentation with no unintentional legacy branding.
- Preserves: an expected-red repository-wide inventory whose remaining unclassified matches belong
  only to the later runtime, localization, packaging, visual-asset, and native-helper plans.

- [ ] **Step 1: Rebrand current engineering docs without rewriting history**

Use Showhow for current commands, variables, artifact names, paths, and product behavior. Where a
legacy OpenScreen variable/path remains supported, label it `Legacy compatibility` and add the file
to the allowlist with that exact reason.

- [ ] **Step 2: Classify dated historical docs**

Add dated completed specs/plans and `implementation-notes.md` to the allowlist only when the
OpenScreen reference describes a past decision or legacy behavior. Do not allowlist active source.

- [ ] **Step 3: Close documentation scope without weakening the global guard**

Run: `npm run branding:check`

Expected: FAIL until the later runtime and visual/packaging plans complete. Review every reported
match in the files owned by this task: it must be either removed or explicitly classified for
historical/legacy compatibility. Do not allowlist active source merely to force a green result.

Run a scoped search across `docs`, `electron/native/README.md`, and
`scripts/diagnostic-tool/README.md` and confirm that any remaining source-ancestor name appears only
in a dated historical file, focused attribution, or an explicitly labelled legacy-compatibility
instruction.

Run: `npm run lint && npm run test && npx tsc --noEmit && git diff --check`

Expected: all exit `0`.

- [ ] **Step 4: Commit**

```bash
git add docs electron/native/README.md scripts/diagnostic-tool/README.md \
  config/branding-allowlist.json
git commit -m "docs: align active engineering guidance with Showhow"
```
