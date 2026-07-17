# GitHub Actions workflows

## Overview

Showhow uses four workflow files: CI, release builds, review routing, and stale-review marking.

## `ci.yml`

Runs for pushes to `main` and pull requests targeting `main`.

- `lint`: runs `npm run lint` and `npm run branding:check`.
- `typecheck`: runs `npx tsc --noEmit`.
- `test`: runs unit tests, installs Playwright browser dependencies, then runs browser tests.
- `build`: runs `npx vite build`.
- `semantic-pr`: requires pull request titles to use an approved Conventional Commit type.

The lint, typecheck, test, and build jobs use `.github/actions/setup` for the pinned Node.js version
and `npm ci`.

## `build.yml`

Runs for `v*` tags and manual dispatches. A manual dispatch selects a macOS architecture and may
provide a release tag. Without a release tag, the workflow only uploads 30-day build artifacts.

- `build-windows` runs `npm run build:win -- --publish never` and uploads `showhow-windows`.
- `build-macos` builds native helpers and signed or unsigned DMGs for `arm64`, `x64`, or both, then
  uploads `showhow-mac-arm64` and/or `showhow-mac-x64`. Signing and notarization run when every Apple
  signing secret is present and `github.ref_name` does not contain `-`. A tag-triggered prerelease
  such as `v1.5.0-rc.1` therefore skips those steps. A manual dispatch from `main` with
  `release_tag=v1.5.0-rc.1` still signs and notarizes because its ref name is `main`.
- `build-linux` runs `npm run build:linux -- --publish never` and uploads `showhow-linux`.
- `publish-release` validates the tag against `package.json`, downloads the platform artifacts, and
  creates or updates the GitHub release. Tags ending in `-rc.N`, `-beta.N`, or `-alpha.N` become
  prereleases.

The publish job authenticates with `SHOWHOW_RELEASE_TOKEN`.

**Legacy compatibility:** `build.yml` temporarily falls back to `OPENSCREEN_RELEASE_TOKEN` when
`SHOWHOW_RELEASE_TOKEN` is unset. Keep both repository secrets during cutover, verify a release with
the Showhow token, then remove the legacy secret and fallback in a dedicated workflow change.

## `review-glue.yml`

Handles scored Greptile reviews and comments. A score of at least 4/5 with no `CRITICAL` finding
adds `review-passed`. A first failed round routes focused fixes to Copilot and advances to `round-2`;
a failed second round adds `needs-human`. The workflow uses `BEDAR_LOOP_PAT`.

## `stale.yml`

Runs daily at 06:00 UTC and on manual dispatch. Open pull requests that have waited more than one day
with `needs-review`, but without `review-passed` or `needs-human`, receive `stale`; the label is
removed automatically when those conditions no longer apply.
