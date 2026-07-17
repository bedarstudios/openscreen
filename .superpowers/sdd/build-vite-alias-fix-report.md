# Electron bundle alias fix report

## Root cause

`electron/projectFilePolicy.ts` consumes `src/lib/projectFilePolicy.ts`, but that shared renderer
module imported product identity through the renderer-only `@/` alias. The Electron Vite graph does
not configure that alias, so its bundle could not resolve the dependency.

## RED

Added an Electron-side boundary regression test that reads `src/lib/projectFilePolicy.ts` and
rejects `@/` imports. Under Node 22.22.1/npm 10.9.4, the focused test failed as intended and showed
the offending `from "@/shared/productIdentity"` import.

## GREEN

Changed only that production import to the boundary-safe relative path
`../shared/productIdentity`. No project-file behavior changed.

## Verification

- `npm run test -- electron/projectFilePolicy.test.ts src/lib/projectFilePolicy.test.ts` — 2 files,
  15 tests passed.
- `npm run build-vite` — renderer, Electron main, and preload bundles built successfully.
- `npm run test -- --reporter=dot` — 63 files, 471 tests passed.
- `npx tsc --noEmit` — passed.
- `npx biome check electron/projectFilePolicy.test.ts src/lib/projectFilePolicy.ts` — passed.
- `git diff --check` — passed.

Environment: Node 22.22.1, npm 10.9.4.

Commit: `0821d72` (pre-report-amend identifier; the final amended SHA is reported to the parent task).
