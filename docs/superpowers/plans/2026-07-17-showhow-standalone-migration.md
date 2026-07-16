# Showhow Standalone Migration Plan Series

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the inherited OpenScreen fork into an independently branded, backward-compatible
Showhow Desktop repository without losing history, user data, or native capture behavior.

**Architecture:** Execute four ordered plans. First establish repository policy and active
documentation, then migrate runtime identifiers behind tested compatibility readers, then replace
visual/package identity, and only then cut over to an independent GitHub repository. Every plan is
independently reviewable and must be complete before the next begins.

**Tech Stack:** Electron, React, TypeScript, Vitest, Biome, Swift Package Manager, CMake, Nix,
electron-builder, Git, GitHub CLI.

## Global Constraints

- Canonical repository: `bedarstudios/showhow-desktop`.
- Canonical product/package names: `Showhow` and `showhow-desktop`.
- Canonical application identifier: `com.bedarstudios.showhow`.
- New project files use `.showhow`; `.openscreen` remains readable.
- New persisted keys use `showhow_`; legacy OpenScreen keys are fallback reads only.
- New native-helper variables use `SHOWHOW_*`; `OPENSCREEN_*` remains a compatibility fallback.
- Preserve the existing MIT notice and source provenance.
- Never delete or overwrite legacy user data during migration.
- Never use an unreviewed global search-and-replace.
- Do not change `origin`, archive the old repository, or mutate repository secrets before the new
  repository passes the cutover preflight.
- Full OpenScreen merges are prohibited; future imports are selective and temporary-remote only.

---

## Ordered Plans

1. [Repository identity and guardrails](./2026-07-17-showhow-repository-identity.md)
2. [Runtime identity and legacy compatibility](./2026-07-17-showhow-runtime-compatibility.md)
3. [Visual, localization, and packaging identity](./2026-07-17-showhow-visual-packaging.md)
4. [Independent GitHub cutover](./2026-07-17-showhow-github-cutover.md)

## Cross-Plan Gates

- [ ] **Gate 1:** Plan 1 branding policy passes and active docs no longer describe an ongoing
  OpenScreen fork.
- [ ] **Gate 2:** Plan 2 tests prove new `.showhow` writes plus legacy project, storage, cache, and
  helper fallback reads.
- [ ] **Gate 3:** Plan 3 produces verified platform assets and a successful macOS
  record-save-reopen-edit-export smoke test.
- [ ] **Gate 4:** Plan 4 verifies the independent repository before changing the checkout's
  `origin` or archiving `bedarstudios/openscreen`.

## Final Acceptance

Run from the repository root:

```bash
npm run test
npm run test:browser
npm run i18n:check
npm run branding:check
npx tsc --noEmit
npm run lint
npm run build-vite
git diff --check
```

Expected: every command exits `0`; the branding check reports no unclassified OpenScreen matches;
the working tree contains only the reviewed migration changes.
