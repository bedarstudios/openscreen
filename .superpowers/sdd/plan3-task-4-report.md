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

The initial `npm run build-vite` run built the renderer successfully, then exposed an independent
Electron alias issue. Root fixed that prerequisite separately in `57cc79c`; the post-fix Task 4
verification sequence reruns the complete build below.

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

## Commit sequence

- `54fbfb4`: `build: package Showhow under its standalone identity`
- `57cc79c`: separately owned prerequisite alias fix; not part of Task 4's package changes
- Task 4 review follow-up: `fix: tighten Showhow release identity guards` (this report's commit;
  exact SHA recorded in the task handoff)

## Review follow-up

- RED: the exact workflow installer-name assertion failed because the Create DMG step still emitted
  `Showhow-Mac-${ARCH}-${VERSION}.dmg`.
- GREEN: the workflow now emits
  `showhow-desktop-Mac-${ARCH}-${VERSION}-Installer.dmg`, matching builder and manual script intent.
- Guard hardening: the package test now asserts the exact only permitted legacy occurrence sets in
  the allowlisted workflow, helper build, and preview files, including Showhow-before-legacy order.
- Mutation evidence: adding one extra `openscreen` occurrence to the allowlisted helper file made
  the focused test fail on the exact occurrence set; removing the probe restored green.

## Concerns

- Nix evaluation still needs a Nix-capable host.
- No GitHub mutation, push, release, installer build, signing, or notarization was performed.
