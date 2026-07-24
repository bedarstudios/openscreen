# Plan 3 Task 2 report

## Result

Implemented a deterministic icon pipeline from the approved
`docs/design/brand/showhow-app-icon.svg`. The generator emits all nine required PNG sizes, a
seven-image Windows ICO, a real macOS ICNS created by `iconutil`, and `public/showhow.png`. It also
removes the inherited OpenScreen, Vite, and React starter marks.

Implementation snapshot before this report's final amendment:
`ab1c1fb build: generate Showhow application icons`. The final amended SHA is reported to the
orchestrating agent because a commit cannot contain its own final hash.

## TDD evidence

- RED: `npx vitest run .github/scripts/generate-app-icons.test.mjs` failed 4/4 tests because the
  generator command and direct dependencies were absent, `public/showhow.png` was missing, the
  generator module did not exist, and no non-macOS failure contract was implemented.
- GREEN: after the minimal generator and package declarations were added, the focused suite passed
  4/4 tests. Review follow-up first failed on missing portable container validators, then passed
  6/6 after bounded ICO/ICNS parsing was added. The tests cover the complete manifest, formats and dimensions, obsolete-file removal,
  canonical-source sensitivity, deterministic reruns on macOS, and clear failure without
  `iconutil`. The macOS-only determinism case is conditionally skipped off macOS so Linux CI does
  not require `iconutil`; the simulated non-macOS failure test still runs everywhere.

## Generated files and dependencies

- Added `scripts/generate-app-icons.mjs` and `.github/scripts/generate-app-icons.test.mjs`.
- Added direct dev dependencies `sharp@^0.32.6` and `png-to-ico@^3.0.2`, plus
  `npm run icons:generate`. The lockfile contains only the new direct entries and the dependency
  records required by `png-to-ico`; incidental resolution updates were removed.
- Replaced `icons/icons/png/{16,24,32,48,64,128,256,512,1024}x<size>.png`,
  `icons/icons/win/icon.ico`, and `icons/icons/mac/icon.icns`.
- Added `public/showhow.png`; deleted `public/openscreen.png`, `public/vite.svg`, and
  `src/assets/react.svg`.

## Reproducibility and format evidence

Two consecutive `npm run icons:generate` executions produced identical SHA-256 manifests:

```text
d5e704965dda0a2b0ebbdf91b32e54153813389b08fa62cc05e0088e351363cd  1024x1024.png
4d4f0f0b13b7a0b3e1873efafdceacbd087adbc91b2c35f4a6ccb636112d750c  128x128.png
f8c821984fe305ccceffc2bd7ad0cd5fbf044ce05c8e9dc26069f89330b5ab8f  16x16.png
fdff2a8f846e6323b1fc083ca80c35850bafdaee4d9db60b4493f1cc3b02b4e0  24x24.png
29edc48c2e38c32cc8bcf33cbdd5d63df5d7307ec2863bff5737344d5e1d1774  256x256.png
8b7ce0d6cccdb7a8589dc22ca908b6ba00cb6242eebabcc552deb7083f25bba4  32x32.png
787ca4a9d4bacbd752aded710e4cde212cc9a068ad4eef4b0a8439aca6e49bca  48x48.png
1af2f0e8bd27be155b84517578f344895d5e214a30676c5f705cf38900d8cc5e  512x512.png
da49be51a33d6f9c327a54556c420bc92ef88a77fd4bb719361230670f360d36  64x64.png
462d6c1580092e8e68db49836730a154866461630f18907ebd3b1b34a5bf12a8  icon.icns
71460f1a022b47896752780593edddec91cd79a1a6d7dc45cc832f0476884912  icon.ico
1af2f0e8bd27be155b84517578f344895d5e214a30676c5f705cf38900d8cc5e  public/showhow.png
```

`file` identified every PNG at its requested RGBA dimensions, the ICO as a Windows icon resource
with seven images, and the ICNS as a macOS icon. Converting the generated ICNS back to an iconset
with `iconutil` produced the complete 16, 32, 128, 256, and 512 point 1x/2x set.

Portable CI validation now parses the ICO directory and requires exactly 16, 24, 32, 48, 64, 128,
and 256 px 32-bit entries with valid payload offsets, lengths, and PNG-or-DIB structure. It parses
the ICNS declared big-endian length and walks every bounded chunk to EOF, requiring iconutil's
  `ic04`, `ic05`, `ic07`, `ic08`, `ic09`, `ic10`, `ic11`, `ic12`, `ic13`, and `ic14`
representations. Truncation, fake-header, corrupt-offset, and corrupt-chunk-length mutations are
asserted to fail.

Final payload review first demonstrated RED when a corrupted ICNS image payload passed the
container-only parser. The validator now requires PNG signatures plus exact IHDR square dimensions
for `ic11=32`, `ic12=64`, `ic07=128`, `ic13/ic08=256`, `ic14/ic09=512`, and `ic10=1024`.
Legacy `ic04`/`ic05` representations require the iconutil `ARGB` marker and nontrivial bounded
compressed data. Mutation coverage rejects a wrong PNG signature, altered IHDR width, invalid
legacy marker, and empty legacy payload. ICO DIB validation also requires zero compression and the
exact 32-bit pixel-plus-mask payload length.

## Visual inspection

Inspected `/tmp/showhow-icon-contact-sheet.png` at 16, 32, 128, 512, and 1024 px. The recording
bracket, three ascending steps, signal-green terminal, cream tile, and separating gaps remain
recognizable at every size. The 16 px render is pixel-coarse as expected but does not collapse into
a generic or inherited mark. The temporary contact sheet was not committed.

## Verification

- Focused tests: 1 file, 6 tests passed.
- Full unit suite after review follow-up: 60 files, 455 tests passed. Existing intentional
  diagnostic warnings remained.
- `npx tsc --noEmit`: passed.
- Scoped Biome check: passed after formatting.
- `npm ci --dry-run --ignore-scripts`: passed, confirming package/lock consistency.
- `git diff --check`: passed.
- Branding inventory: still diagnostic-red only on visible copy, package/release configuration,
  planned compatibility references, and unrelated legacy worktree material assigned to later Plan
  3 tasks. The three obsolete icon/starter assets removed by this task no longer appear.

## Concerns

No blocking concerns. ICNS regeneration intentionally requires macOS and deletes a stale ICNS
before failing on other platforms. Windows ICO structure is validated on macOS, but visual shell
display remains part of the later platform acceptance task.
