# Showhow Package Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the active npm, runtime, Nix, executable, and CI artifact identity from
`showhow-desktop` to `showhow`.

**Architecture:** Treat the package name as one cross-platform identity contract enforced by the
existing package-identity test. Change the test first, then update all active producers and
consumers atomically while leaving product display, application ID, persistence compatibility, and
historical records unchanged.

**Tech Stack:** npm, TypeScript, Vitest, GitHub Actions YAML, Nix flakes and modules

## Global Constraints

- The active public package, executable, Nix option/attribute, artifact prefix, and build user-agent
  are `showhow`.
- The display name remains `Showhow`.
- The application ID remains `com.bedarstudios.showhow`.
- Do not change persistence keys or legacy project compatibility.
- Do not rewrite historical specifications, superseded plans, or their filenames.
- Do not retain deprecated `showhow-desktop` compatibility aliases.

---

### Task 1: Make the package-identity contract require `showhow`

**Files:**

- Modify: `.github/scripts/package-identity.test.mjs`

**Interfaces:**

- Consumes: active package and packaging configuration as UTF-8 text.
- Produces: a failing identity contract requiring the canonical `showhow` npm, Nix, executable,
  workflow-artifact, and user-agent names.

- [ ] **Step 1: Change the npm package expectation**

Replace:

```js
expect(manifest.name).toBe("showhow-desktop");
```

with:

```js
expect(manifest.name).toBe("showhow");
```

- [ ] **Step 2: Change the Nix identity expectations**

Require every active Nix file to contain `showhow`, reject `showhow-desktop`, and require:

```js
expect(packageSource).toContain('mainProgram = "showhow"');
```

- [ ] **Step 3: Change workflow artifact expectations**

Use these exact expected artifact names:

```js
for (const artifact of [
	"showhow-windows",
	"showhow-mac-${{ matrix.arch }}",
	"showhow-linux",
]) {
	expect(workflow).toContain(`name: ${artifact}`);
}
expect(workflow).not.toContain("showhow-desktop");
```

- [ ] **Step 4: Change the model-download user-agent expectation**

Require:

```js
expect(source).toContain('"user-agent": "showhow-build"');
expect(source).not.toContain("showhow-desktop");
```

- [ ] **Step 5: Run the targeted test and confirm RED**

Run:

```bash
npx vitest --run .github/scripts/package-identity.test.mjs
```

Expected: FAIL because the package manifest, Nix files, workflow, and user-agent still contain
`showhow-desktop`.

- [ ] **Step 6: Commit the failing contract**

```bash
git add .github/scripts/package-identity.test.mjs
git commit -m "test(showhow): require canonical package name"
```

### Task 2: Rename all active package and distribution producers

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/shared/productIdentity.ts`
- Modify: `nix/package.nix`
- Modify: `nix/module.nix`
- Modify: `nix/hm-module.nix`
- Modify: `flake.nix`
- Modify: `.github/workflows/build.yml`
- Modify: `scripts/fetch-caption-model.mjs`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: the identity contract from Task 1.
- Produces: `showhow` as the active npm package name, runtime package constant, Linux executable,
  Nix package/module identity, CI artifact prefix, and packaging user-agent.

- [ ] **Step 1: Rename npm and runtime metadata**

Set the root `name` field in `package.json`, the top-level and root-package `name` fields in
`package-lock.json`, and the shared constant to:

```ts
export const PACKAGE_NAME = "showhow";
```

- [ ] **Step 2: Rename the Nix package and executable**

In `nix/package.nix`, use `showhow` for:

- `pname`;
- `$out/lib/showhow`;
- `$out/bin/showhow`;
- installed icon filename;
- desktop item `name`, `exec`, and `icon`;
- `meta.mainProgram`.

Keep `desktopName = "Showhow"` unchanged.

- [ ] **Step 3: Rename Nix flake and module interfaces**

Expose `packages.<system>.showhow`, make the default package reference `.showhow`, and expose the
overlay key `showhow`. In both module files, use:

```nix
cfg = config.programs.showhow;
options.programs.showhow = {
```

Update examples and defaults to use `inputs.showhow` and
`self.packages.${pkgs.stdenv.hostPlatform.system}.showhow`.

- [ ] **Step 4: Rename CI artifacts**

Change every active upload/download artifact name in `.github/workflows/build.yml` from:

```text
showhow-desktop-windows
showhow-desktop-mac-...
showhow-desktop-linux
```

to:

```text
showhow-windows
showhow-mac-...
showhow-linux
```

- [ ] **Step 5: Rename the packaging user-agent and contributor path**

Set the caption-model request header to:

```js
{ "user-agent": "showhow-build" }
```

Update `CONTRIBUTING.md` clone and `cd` examples to use the canonical `showhow` repository
directory.

- [ ] **Step 6: Run the targeted identity test and confirm GREEN**

Run:

```bash
npx vitest --run .github/scripts/package-identity.test.mjs
```

Expected: all package-identity tests PASS.

- [ ] **Step 7: Commit the implementation**

```bash
git add package.json package-lock.json src/shared/productIdentity.ts \
  nix/package.nix nix/module.nix nix/hm-module.nix flake.nix \
  .github/workflows/build.yml scripts/fetch-caption-model.mjs CONTRIBUTING.md
git commit -m "chore(showhow): align package and distribution names"
```

### Task 3: Verify the coordinated rename

**Files:**

- Verify only: all files changed in Tasks 1 and 2

**Interfaces:**

- Consumes: completed rename.
- Produces: test, type, branding, Nix, diff, and search evidence.

- [ ] **Step 1: Run required project checks**

```bash
npx vitest --run .github/scripts/package-identity.test.mjs
npx tsc --noEmit
npm run branding:check
```

Expected: all commands exit zero.

- [ ] **Step 2: Evaluate Nix identities when Nix is available**

If `command -v nix` succeeds, run:

```bash
nix eval .#packages.x86_64-linux.showhow.pname
nix eval .#packages.aarch64-linux.showhow.pname
```

Expected: both commands output `"showhow"`. If Nix is unavailable, record that this check was not
run rather than claiming it passed.

- [ ] **Step 3: Audit remaining old-name occurrences**

```bash
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!release/**' \
  "showhow-desktop" .
```

Expected: remaining occurrences are limited to `.git` metadata, historical specifications,
superseded plans, their filename references, and explicit negative assertions in the active
package-identity test.

- [ ] **Step 4: Inspect repository integrity**

```bash
git diff --check
git status -sb
git log -3 --oneline
```

Expected: no whitespace errors; the branch contains the design, test-contract, and implementation
commits; no unrelated user changes were modified.
