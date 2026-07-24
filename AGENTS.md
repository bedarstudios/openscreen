# AGENTS.md

Showhow is a free, local-first desktop screen recorder and workflow-documentation tool built with
Electron, React, TypeScript, and Pixi.js. It is pre-1.x and not production-grade. This is the
canonical guide for coding agents in `bedarstudios/showhow`.

## Product boundaries

- V1 is **record → folder bundle → workflow doc → copy path**.
- Keep the inherited recorder and editor working while adding Showhow functionality.
- Showhow owns its product direction. Do not add paywalls, premium tiers, upsells, or required cloud
  services.
- The attributed source ancestor is not an operational parent. Never perform a full source-branch
  merge. Follow `UPSTREAM.md` for a focused, reviewed import.
- Do not claim planned doc-engine, library, bridge, or polish features are complete unless current
  code and acceptance evidence prove it.

## Setup commands

- Install deps: `npm install` (Node 22.22.1, npm 10.9.4; see `package.json#engines`)
- Start dev: `npm run dev` (Vite dev server; Electron opens through `vite-plugin-electron`)
- Build: `npm run build` (TypeScript, Vite, and electron-builder)
- Renderer build: `npm run build-vite` (TypeScript and Vite without packaging)
- Typecheck: `npx tsc --noEmit`
- Test (unit): `npm run test` (Vitest, jsdom)
- Test (browser): `npm run test:browser` (requires `npm run test:browser:install` once)
- Test (e2e): `npm run test:e2e` (Playwright)
- Lint: `npm run lint` (Biome 2.4)
- Lint fixes: `npm run lint:fix`
- Format: `npm run format` (Biome, tabs, double quotes, 100 columns)
- i18n check: `npm run i18n:check` (validates all 13 locale files)
- Branding audit: `npm run branding:check`

## Project layout

- `src/` — React UI, editor, timeline, i18n, captioning, cursor, exporter, and Showhow renderer code
- `src/lib/showhow/` — Showhow transcript and renderer-side bundle behavior
- `electron/` — main process, IPC, recording orchestration
- `electron/showhow/` — Showhow bundle behavior in the main process
- `electron/native/` — shipped Swift ScreenCaptureKit and C++/Win32 WGC capture helpers
- `docs/architecture/showhow-bundles.md` — active bundle/save/transcription contract
- `tests/` — Playwright e2e specs and fixtures
- `scripts/` — native builds, diagnostics, and policy checks
- `nix/`, `flake.nix` — Linux packaging
- `release/`, `dist-electron/` — generated, gitignored build artifacts

## Code style

- TypeScript strict mode. Do not add explicit `any`.
- Biome handles lint and formatting: tabs, double quotes, 100-column width, LF line endings.
- Use React functional components and keep hooks at the top level.
- Follow `useImportType`; allow Biome to organize imports.
- Husky and lint-staged run Biome on staged TypeScript, JavaScript, and JSON files.
- Keep new Showhow-specific main and renderer logic in the existing Showhow directories so its
  ownership stays reviewable.

## Compatibility constraints

- New project files use `.showhow`; existing `.openscreen` files remain readable.
- Opening a legacy project must not overwrite it. A subsequent save defaults to a new `.showhow`
  file unless the user explicitly chooses otherwise.
- New persistence writes use Showhow names. Reads try the Showhow location/key first and then the
  legacy location/key; migrate only when it can be done without data loss.
- Preserve legacy data during application-directory, preference, font, cache, recording, helper,
  environment-variable, and serialized-value migrations.
- Never break the `<video path>.cursor.json` convention; the editor resolves telemetry from it.
- Stop and classify an identifier before changing it if its persistence, IPC, native-packaging, or
  helper-discovery role is unclear.

## Testing instructions

- Unit tests live beside source as `*.test.ts` and `*.test.tsx`.
- Browser tests use `vitest.browser.config.ts`; run them when DOM or Pixi rendering matters.
- E2E tests live in `tests/e2e/`; some are platform-specific.
- Add a same-package test for every new behavior.
- Run the smallest relevant test during iteration, then the affected full suites before a PR.
- CI runs unit and browser tests on every PR. Run TypeScript, Biome, i18n, and branding checks when
  the changed surface requires them.

## Native-code safety

- Native capture is platform-fragile and security-sensitive. macOS uses ScreenCaptureKit; Windows
  uses WGC. These helpers are built and shipped with the app rather than loaded from npm.
- Review `macos.entitlements` when changing native recorder permissions.
- Treat code in native and helper directories as elevated-trust code.
- Linux CI cannot prove native macOS or Windows behavior. Smoke-test native changes on the target
  operating system and report any untested platform explicitly.
- Preserve save behavior on documentation-layer failures; a bundle or transcript error must never
  discard a valid recording.

## Pull requests and releases

Showhow is pre-v1 and releases from a single workflow. Upstream OpenScreen's RC
pipeline — `prerelease.yml`, `promote.yml`, release branches, milestone
migration, Discord announcements, and the homebrew/winget/nix/aur publishers —
was deleted. Do not reintroduce any of it or write docs that assume it exists.

- **Cut a release**: push a `v*` tag. `build.yml` builds macOS (arm64 + x64),
  Windows, and Linux installers, then `publish-release` creates the GitHub
  Release and uploads them.
- **Build without releasing**: Actions → "Build Electron App" → Run workflow.
  Takes an `arch` input and an optional `release_tag`; leave the tag empty to get
  installers as workflow artifacts only.
- **Pre-releases**: any tag containing `-` (e.g. `v1.7.0-rc.1`) is published as a
  GitHub pre-release, and macOS notarization is skipped.

`publish-release` needs the `OPENSCREEN_RELEASE_TOKEN` secret — a legacy name,
still in use; see `docs/secrets.md` for what it does and how to rename it.
Signing and notarization degrade gracefully: if the Apple secrets are absent the
build still publishes, but the DMG is unsigned.

## Security

- Never commit secrets. `.env.example` exists; real `.env` is gitignored.
- `macos.entitlements` controls macOS permissions — review when touching native recorder.
- Native helpers run with elevated privileges on user systems; treat code in `electron/*-helper/` as security-sensitive.

## Specialized notes

- **Native capture is platform-fragile**: macOS uses ScreenCaptureKit (Swift), Windows uses WGC (C++/Win32). CI runs on Linux only — manual smoke test on real macOS/Windows is required for native changes.
- **Pixi.js v8** is the rendering engine. Filters come from `pixi-filters` and `@pixi/filter-drop-shadow`. GSAP + `motion` for animation.
- **i18n**: 13 locales in `src/i18n/locales/<locale>/` (e.g. `src/i18n/locales/en/settings.json`). The `i18n:check` script validates them — run it after touching translation files.
- **Build pipeline**: `npm run build` is full electron-builder. For iterating on renderer only, use `npm run build-vite` (Vite + tsc, no packaging).
- **README tone**: the project is explicitly "not production-grade" and free forever — don't add paywalls, premium tiers, or upsell language to UI/copy.
