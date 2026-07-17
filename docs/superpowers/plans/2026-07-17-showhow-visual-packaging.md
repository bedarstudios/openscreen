# Showhow Visual and Packaging Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every released or user-visible OpenScreen identity with approved Showhow assets,
localized copy, package metadata, installer names, and platform configuration.

**Architecture:** Approve one icon direction against the existing Showhow design system, keep one
SVG source, generate deterministic platform derivatives, then wire the assets and canonical product
constants through Electron, locales, electron-builder, Nix, and CI release artifacts.

**Tech Stack:** SVG, Sharp, Electron, i18next JSON, electron-builder, Nix, GitHub Actions.

## Global Constraints

- Use the approved cream/ink/sage/forest/signal Showhow design system.
- Do not ship inherited OpenScreen, Vite, or React marks.
- All 13 locale key structures must remain identical.
- Package application ID is `com.bedarstudios.showhow`.
- Artifact prefix is `showhow-desktop`.

---

### Task 1: Approve and source the Showhow application icon

**Files:**
- Create: `docs/design/brand/showhow-app-icon.svg`
- Create: `docs/design/brand/README.md`

- [ ] **Step 1: Generate three icon candidates**

Use the image-generation workflow with this prompt:

```text
Create three distinct square macOS application-icon concepts for Showhow, a local-first screen
recorder that turns recordings into step-by-step workflow documents. Use the existing Showhow
palette: cream #FFFCF7, ink #2F2F2F, sage #82B09A, forest #142F18, signal green #6BFF7E. Favor a
simple geometric mark combining a recording frame, ordered step, and forward motion. No letters,
text, gradients, glass effects, camera lens cliché, or OpenScreen-derived shapes. The mark must
remain recognizable at 16 px and work on macOS, Windows, and Linux.
```

- [ ] **Step 2: Obtain explicit user approval for one candidate**

Do not proceed with packaging assets until one candidate is approved. Record the chosen concept,
palette, clear-space rule, and small-size simplification in `docs/design/brand/README.md`.

- [ ] **Step 3: Create the canonical vector source and commit**

Normalize the approved art into a square SVG with no embedded raster data, external fonts, or
unexpanded text. Verify it renders at 16, 32, 128, 512, and 1024 px.

```bash
git add docs/design/brand/showhow-app-icon.svg docs/design/brand/README.md
git commit -m "design: add approved Showhow app icon"
```

### Task 2: Generate deterministic platform icon assets

**Files:**
- Create: `scripts/generate-app-icons.mjs`
- Create: `.github/scripts/generate-app-icons.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Replace: `icons/icons/png/*.png`
- Replace: `icons/icons/mac/icon.icns`
- Replace: `icons/icons/win/icon.ico`
- Create: `public/showhow.png`
- Delete: `public/openscreen.png`
- Delete: `public/vite.svg`
- Delete: `src/assets/react.svg`

**Interfaces:**
- Produces: `npm run icons:generate` from the canonical SVG.

- [ ] **Step 1: Add a failing manifest test**

```js
import fs from "node:fs";
import { expect, it } from "vitest";

it("contains every required Showhow icon derivative", () => {
	for (const file of [
		"public/showhow.png",
		"icons/icons/png/16x16.png",
		"icons/icons/png/1024x1024.png",
		"icons/icons/mac/icon.icns",
		"icons/icons/win/icon.ico",
	]) expect(fs.existsSync(file), file).toBe(true);
});
```

- [ ] **Step 2: Install a direct icon-generation dependency**

Run: `npm install --save-dev sharp png-to-ico`

Expected: `package.json` and lockfile add both direct dev dependencies.

- [ ] **Step 3: Implement generation**

The script must render PNG sizes `[16, 24, 32, 48, 64, 128, 256, 512, 1024]`, use `png-to-ico`
for Windows, and use macOS `iconutil` for ICNS. It must fail on non-macOS when ICNS regeneration is
requested rather than silently keeping a stale file. Add `"icons:generate": "node scripts/generate-app-icons.mjs"`.

- [ ] **Step 4: Generate, test, and commit**

Run on macOS: `npm run icons:generate`

Run: `npx vitest run .github/scripts/generate-app-icons.test.mjs`

Expected: PASS and every derivative exists.

```bash
git add scripts/generate-app-icons.mjs .github/scripts/generate-app-icons.test.mjs \
  package.json package-lock.json icons public src/assets
git commit -m "build: generate Showhow application icons"
```

### Task 3: Replace visible application copy and localization

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/ipc/handlers.ts` (visible accessibility fallback strings only)
- Modify: `src/App.tsx` (default visible fallback heading only)
- Modify: `src/components/video-editor/EditorEmptyState.tsx`
- Modify: `src/components/video-editor/UnsavedChangesDialog.tsx`
- Modify: `src/i18n/locales/*/{common,dialogs,editor,launch}.json`
- Modify: `src/i18n/locales/*/{settings,shortcuts,timeline}.json` as required to restore locale-key parity
- Modify: `index.html`
- Modify: `public/showhow.png`

- [ ] **Step 1: Add visible-brand assertions**

Update existing launch/empty-state tests to assert `Showhow` in About, Hide, accessibility,
source-load, empty-project, and system-language copy. Add a test that both `.showhow` and legacy
`.openscreen` appear only where project compatibility is explained.

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test -- --run src/components/launch src/components/video-editor/EditorEmptyState.test.tsx`

Expected: FAIL on current OpenScreen strings/assets.

- [ ] **Step 3: Update all locales without translating product names**

Replace the literal brand with `Showhow` in all 13 locales; retain surrounding existing
translations. Use the translation key `showhowProject`. Update compatibility copy to name
`.showhow` first and `.openscreen` as legacy. Update favicon and image references to
`/showhow.png`.

- [ ] **Step 4: Verify and commit**

Run: `npm run i18n:check && npm run test`

Expected: both exit `0`. Run `npm run branding:check` diagnostically: visible-copy matches owned by
this task must be gone, while package, bundle, Nix, entitlement, preview-script, and release
identity remain intentionally visible until Task 4. Do not allowlist those active Task 4 matches.

```bash
git add electron/main.ts src/components/video-editor src/i18n index.html public/showhow.png \
  config/branding-allowlist.json
git commit -m "feat: replace visible product identity with Showhow"
```

### Task 4: Replace package and release identity

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `electron-builder.json5`
- Modify: `macos.entitlements`
- Modify: `flake.nix`
- Modify: `nix/package.nix`
- Modify: `nix/module.nix`
- Modify: `nix/hm-module.nix`
- Modify: `.github/workflows/build.yml`
- Modify: `.github/actions/setup/action.yml`
- Modify: `scripts/capture-openscreen-preview.mjs` and rename to `scripts/capture-showhow-preview.mjs`

**Interfaces:**
- Produces package `showhow-desktop`, product `Showhow`, app ID `com.bedarstudios.showhow`, and
  release files prefixed `showhow-desktop`.

- [ ] **Step 1: Add a packaging identity test**

Create `.github/scripts/package-identity.test.mjs` that parses `package.json` and imports the
JSON5 builder config after stripping comments, asserting canonical package/product/app IDs and that
the build workflow contains no `openscreen-` artifact names.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run .github/scripts/package-identity.test.mjs`

Expected: FAIL on current package and builder values.

- [ ] **Step 3: Update every packaging surface**

Set package name, builder app ID/productName, permission descriptions, Nix attributes/modules,
preview command, artifact upload names, DMG/EXE/AppImage/deb/pacman names, and example env values to
the canonical Showhow namespace. Rename the preview script with `git mv` and keep command behavior
unchanged.

- [ ] **Step 4: Verify config and commit**

Run: `npx vitest run .github/scripts/package-identity.test.mjs`

Run: `npm run build-vite && nix flake check --no-build`

Expected: tests/build/check exit `0`.

```bash
git add package.json package-lock.json .env.example electron-builder.json5 macos.entitlements \
  flake.nix nix .github scripts config/branding-allowlist.json
git commit -m "build: package Showhow under its standalone identity"
```

### Task 5: Run platform and real-app acceptance

**Files:**
- Create: `docs/evidence/showhow-identity-acceptance.md`
- Create: `docs/evidence/showhow-identity/`

- [ ] **Step 1: Run the complete automated gate**

```bash
npm run test
npm run test:browser
npm run i18n:check
npm run branding:check
npx tsc --noEmit
npm run lint
npm run build-vite
npm run build:native:mac
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 2: Build and inspect the macOS app**

Run: `npx electron-builder --mac --dir --publish never`

Verify the `.app` name, bundle identifier, Finder icon, Dock icon, menu name, About/Hide/Quit copy,
permission prompts, user-data location, helper filenames, and diagnostics output are Showhow.

- [ ] **Step 3: Run the real workflow**

Record 20–30 seconds, save a `.showhow` project, quit, reopen, edit, and export MP4. Then open a
fixture `.openscreen` project and save it as `.showhow`. Record observable results and screenshots
in `docs/evidence/showhow-identity-acceptance.md`.

- [ ] **Step 4: Commit evidence**

```bash
git add docs/evidence/showhow-identity-acceptance.md docs/evidence/showhow-identity
git commit -m "test: verify Showhow identity in the packaged app"
```
