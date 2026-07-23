# Git Workflow for Showhow

Conventions for the Mavis reins when working in this repo.

## Branches

- Default branch: `main`. Never push to it directly.
- Feature branches: `feature/<short-kebab>` or `fix/<short-kebab>`. Match the style of recent merged PRs.
- One PR = one concern. Don't bundle a refactor with a feature.

## Commits

- Short imperative summary line (≤72 chars). Optional body explaining the why.
- Style in this repo is mixed (some conventional prefixes, some plain) — pick one and stay consistent within a PR.
- Husky pre-commit runs lint-staged (Biome on staged `*.{ts,tsx,js,jsx,mts,cts,json}`). Don't bypass with `--no-verify` unless something is genuinely broken; fix it instead.

## Hooks (Mavis)

- Pre-commit (`.harness/hooks/pre-commit.md`) — runs Biome + the affected unit test files. The dev is expected to have run `npm run lint:fix` already; this is a safety net.
- Post-commit (`.harness/hooks/post-commit.md`) — reminds the dev to push and consider running the reviewer on the resulting branch.

## CI (`.github/workflows/ci.yml`)

CI runs on every PR to `main` and every push to `main`:
- `npm run lint` (Biome)
- `npx tsc --noEmit` (TypeScript)
- `npm run test` (Vitest unit)
- `npm run test:browser` (Vitest + Playwright headless)
- `npx vite build` (renderer build smoke)

All five must be green before merge. Native helper code is NOT covered by CI — manual smoke test is required for `electron/*-helper/` changes; note it in the PR description.

## Pull request flow

1. Branch from `main`.
2. Implement + add tests in the same package.
3. Run locally: `npm run lint && npx tsc --noEmit && npm run test`. For browser/e2e-touching changes, also run the relevant suite.
4. Push and open the PR via `gh pr create`. Use `.github/pull_request_template.md`.
5. Wait for the Mavis reviewer (`showhow-reviewer`) PASS or address the requested changes.
6. Merge once CI is green and review is PASS. PR titles must follow Conventional Commits (enforced by the `semantic-pr` job in `ci.yml`) — this keeps the auto-generated release notes clean.

## Release flow

Showhow is pre-v1 and releases from a single workflow, `build.yml`. Upstream
OpenScreen's release-candidate machinery — `prerelease.yml`, `promote.yml`,
release branches, milestone migration, and Discord announcements — was deleted
along with its scripts. Do not reintroduce it.

### Cutting a release

1. Make sure `main` is green.
2. Bump `version` in `package.json` on a normal PR and merge it.
3. Tag the merge commit and push the tag:
   ```bash
   git tag v1.7.0 <sha> && git push origin v1.7.0
   ```
4. `build.yml` builds macOS (arm64 + x64), Windows, and Linux installers, then
   `publish-release` creates the GitHub Release and uploads them.

A tag containing `-` (e.g. `v1.7.0-rc.1`) publishes as a GitHub pre-release and
skips macOS notarization. That is the only remaining pre-release concept.

### Building without releasing

`Actions` → `Build Electron App` → `Run workflow`. Choose `arch`, leave
`release_tag` empty, and the installers land as workflow artifacts instead of a
release.

### Secrets

`publish-release` needs `OPENSCREEN_RELEASE_TOKEN` (legacy name, still live).
Signing and notarization need the Apple secrets. All of them, and the rename
path for that token, are documented in `docs/secrets.md`.
