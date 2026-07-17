# Plan 3 Task 4 report: standalone package and release identity

## Outcome

Showhow now owns the active npm, Electron, Nix, installer, workflow-artifact, preview, signing-example,
and packaging-download identity. Intentional inherited inputs remain read-only and Showhow-first:
the release token, macOS helper architecture variable, preview variables, and preview cursor-data
discovery.

## RED

- Initial `npx vitest run .github/scripts/package-identity.test.mjs`: 5 of 6 tests failed on the
  inherited npm name, Electron app ID, Nix namespace, environment examples, and preview script.
- Metadata expansion: 3 tests failed on inherited package author/maintainer, Linux maintainer, and
  signing examples.
- Approved build-map expansion: 2 tests failed on `scripts/build_macos.sh` output identity and the
  caption model downloader's `openscreen-build` user agent.

## GREEN

- `npx vitest run .github/scripts/package-identity.test.mjs`: 8 tests passed.
- `npm run test -- --reporter=dot`: 63 files, 470 tests passed.
- `npx tsc --noEmit`: passed (also completed as the first stage of `npm run build-vite`).
- Scoped `npx biome check`: passed for the JavaScript/JSON files owned by this task.
- `bash -n scripts/build_macos.sh`: passed.
- `npm ci --dry-run --ignore-scripts`: passed.
- `git diff --check`: passed.
- `nix flake check --no-build`: not run because Nix is not installed on this macOS host.

`npm run build-vite` built the renderer successfully, then failed during the Electron bundle because
Vite could not resolve `@/shared/productIdentity` imported by `src/lib/projectFilePolicy.ts`. This
runtime alias issue predates and is independent of the package identity changes. Per root direction,
Task 4 did not modify runtime code; root will land and diagnose the prerequisite fix before review.

## Configuration matrix

| Surface | Canonical active identity | Compatibility retained |
| --- | --- | --- |
| npm | `showhow-desktop` and `bedarstudios/showhow-desktop` metadata | none |
| Electron | `Showhow`, `com.bedarstudios.showhow` | none |
| Installers | `showhow-desktop-Mac-*`, `showhow-desktop-Linux-*`, `showhow-desktop.Setup.*` | none |
| macOS permissions | Showhow permission descriptions | none |
| Nix | `showhow-desktop` package, overlay, binary, icon, and module option | none |
| CI artifacts | `showhow-desktop-windows`, `showhow-desktop-mac-*`, `showhow-desktop-linux` | inherited release-token secret fallback only |
| Native helper build | `SHOWHOW_MAC_HELPER_ARCHS` | `OPENSCREEN_MAC_HELPER_ARCHS` fallback input |
| Preview capture | `capture:showhow-preview`, Showhow variables/default output paths | inherited variables and cursor temp directory as fallback inputs |
| Manual macOS build | canonical Showhow heading and installer filename | none |
| Caption assets | `showhow-desktop-build` user agent | none |

## Branding diagnostic

`npm run branding:check` remains diagnostic-red by design before Plan 3 Task 5. Remaining categories
include intentional historical/compatibility records plus out-of-Task-4 runtime diagnostics,
settings repository URLs, test fixtures, and native diagnostic tooling. This task narrowly added
allowlist classifications only for its package identity policy test and the four explicit
Showhow-first legacy input fallbacks; it did not hide active package identity.

## Commit

Pending at report creation; commit subject: `build: package Showhow under its standalone identity`.

## Concerns

- Nix evaluation still needs a Nix-capable host.
- The separately owned Electron Vite alias blocker must be fixed and `npm run build-vite` rerun
  before Task 4 review can call the complete build gate green.
- No GitHub mutation, push, release, installer build, signing, or notarization was performed.
