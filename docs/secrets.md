# Secrets and tokens

Showhow uses a small set of GitHub Actions secrets. This file documents what each
one does and how to create or rotate it.

Everything here is verified against the workflows that actually exist in
`.github/workflows/`: `ci.yml`, `build.yml`, `nonpriority-review.yml`,
`overnight-sweep.yml`, and `stale.yml`. Upstream OpenScreen's release-candidate,
Discord, and package-registry pipelines were deleted along with their secrets
documentation — if you are looking for `DISCORD_*`, `HOMEBREW_TAP_TOKEN`,
`WINGET_ACC_TOKEN`, or `AUR_SSH_PRIVATE_KEY`, they are gone on purpose.

## Releases

### `OPENSCREEN_RELEASE_TOKEN`

> **Legacy name.** This secret is still called `OPENSCREEN_RELEASE_TOKEN` because
> renaming a GitHub secret means creating the new one in repository settings
> before the old name can be dropped from `build.yml`. Renaming it in the
> workflow alone breaks every release until the secret exists. See "Renaming
> this secret" below.

A **fine-grained personal access token** consumed by `build.yml#publish-release`
as `GH_TOKEN`. It exists because `GITHUB_TOKEN` cannot create a release in a way
that fires the `release: published` event — GitHub suppresses that to prevent
recursive workflow runs.

**How to create it:**

1. Go to <https://github.com/settings/tokens?type=beta> (fine-grained PATs).
2. **Resource owner**: `bedarstudios`.
3. **Repository access**: `bedarstudios/showhow` only.
4. **Permissions**:
   - `Contents`: Read and write (creating releases, uploading installers)
   - `Metadata`: Read-only (auto-selected)
5. **Expiration**: 1 year. Set a calendar reminder to rotate.
6. Add it as a repository secret — `gh` does not take the value positionally:
   ```bash
   echo "github_pat_xxxxxxxx" | gh secret set OPENSCREEN_RELEASE_TOKEN --repo bedarstudios/showhow
   ```

**Rotation:** generate the new token, update the secret, then revoke the old one.
Both work in parallel until the old one is revoked, so no coordination window is
needed.

**Renaming this secret** (to `SHOWHOW_RELEASE_TOKEN`):

1. `gh secret set SHOWHOW_RELEASE_TOKEN --repo bedarstudios/showhow` with the same value.
2. Update the `GH_TOKEN:` line in `.github/workflows/build.yml#publish-release`.
3. Cut a test release to confirm, then `gh secret delete OPENSCREEN_RELEASE_TOKEN`.

## Automation loops

### `BEDAR_LOOP_PAT`

Used by `nonpriority-review.yml` and `overnight-sweep.yml` to dispatch the cold
reviewer and read PR state. Needs `Contents`, `Issues`, and `Pull requests`
read/write on `bedarstudios/showhow`. Without it those two workflows fail; CI,
builds, and releases are unaffected.

## Apple signing and notarization

`build.yml` signs only when the signing secrets are present, and skips
notarization for any tag containing `-` (i.e. pre-releases). These are consulted
by the macOS build jobs:

- `MAC_CERTIFICATE_P12` (base64 of the Developer ID Application `.p12`)
- `MAC_CERTIFICATE_PASSWORD`
- `MAC_CSC_NAME`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

If any is missing, the build produces an **unsigned** DMG. That is the expected
behavior for forks and CI debug runs — the release still publishes, but macOS
shows a Gatekeeper warning on first install.

The certificate must be Bedar Studios' own Developer ID. `.env.example` documents
the matching local variables for signing a build on your own machine.

## Branch protection

Upstream's `main-protection` ruleset documentation was removed from this file: it
described the `getopenscreen` org, ruleset id `18060803`, and bypass actors that
do not apply to `bedarstudios/showhow`. Check the live configuration instead:

```bash
gh api /repos/bedarstudios/showhow/rulesets --jq '.[] | {id, name}'
```
