# Secrets and tokens

Showhow uses repository secrets for release publication, macOS signing, and review routing. Store
real values only in GitHub; never commit them or place them in `.env` files.

## `SHOWHOW_RELEASE_TOKEN`

`build.yml` uses this fine-grained personal access token when `publish-release` creates or updates a
GitHub release. The token must have read and write access to repository contents in
`bedarstudios/showhow` so releases and release assets can be published.

Create the token under the repository's GitHub organization, give it access only to
`bedarstudios/showhow`, and set it with stdin or `--body`:

```bash
echo "github_pat_xxxxxxxxxxxxxxxxxxxx" | \
  gh secret set SHOWHOW_RELEASE_TOKEN --repo bedarstudios/showhow
```

**Legacy compatibility:** the current workflow evaluates
`secrets.SHOWHOW_RELEASE_TOKEN || secrets.OPENSCREEN_RELEASE_TOKEN`. Keep
`OPENSCREEN_RELEASE_TOKEN` only as a temporary fallback during cutover. After a release succeeds with
`SHOWHOW_RELEASE_TOKEN`, remove the legacy secret and the fallback expression in the same focused
workflow change.

## `BEDAR_LOOP_PAT`

`nonpriority-review.yml` and `overnight-sweep.yml` use this token to dispatch the cold reviewer and
update pull request labels and comments. Give it the minimum contents, pull-request, and issue
write permissions those workflows need. Without it, only those two workflows fail; CI, builds, and
releases are unaffected.

## macOS signing and notarization

macOS builds are signed and notarized when all of these secrets are present and the workflow's
`github.ref_name` does not contain `-`:

- `MAC_CERTIFICATE_P12`
- `MAC_CERTIFICATE_PASSWORD`
- `MAC_CSC_NAME`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

If any value is absent, `build.yml` produces an unsigned DMG. A tag-triggered prerelease such as
`v1.5.0-rc.1` also skips DMG signing and notarization because that tag is `github.ref_name`. A manual
dispatch from `main` with `release_tag=v1.5.0-rc.1` does not skip: its ref name remains `main`, so the
workflow signs and notarizes when every secret is configured.

## Rotation

Create the replacement credential, update the GitHub secret, verify the affected workflow, and then
revoke the old credential. Avoid rotating a release or signing credential during an active release
run.
