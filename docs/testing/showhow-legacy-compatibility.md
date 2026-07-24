# Showhow legacy compatibility gate

This record covers the runtime-identity migration completed in Plan 2. Showhow is the primary
identity and the only writer of new project, storage, profile, and helper identifiers. OpenScreen
names below are retained only as compatibility inputs for existing users. Visible copy, icons,
package metadata, release artifacts, and repository identity remain owned by and will be accepted in
Plan 3.

## Fixture and check matrix

| Scenario | Fixture or action | Expected result | Evidence at this gate |
| --- | --- | --- | --- |
| Clean install | Start with no Showhow or legacy Electron profile and empty browser storage. | Select a new `Showhow` profile; current storage reads return defaults; subsequent writes use only Showhow keys. | Automated unit coverage in `electron/userDataMigration.test.ts`, `src/lib/userPreferences.test.ts`, `src/lib/customFonts.test.ts`, and `src/contexts/I18nContext.test.tsx`. No packaged-app clean-install run was performed. |
| Legacy preferences | Seed `openscreen_user_preferences` with valid JSON and omit `showhow_user_preferences`. | Read the legacy value, copy it to the Showhow key, preserve the legacy key, and write future updates only to the Showhow key. | Automated unit coverage in `src/lib/userPreferences.test.ts` and `src/lib/migratingStorage.test.ts`. |
| Legacy fonts | Seed `openscreen_custom_fonts` and omit `showhow_custom_fonts`. | Read and copy the fonts to the Showhow key without deleting or overwriting the legacy value; future saves use the Showhow key. | Automated unit coverage in `src/lib/customFonts.test.ts` and `src/lib/migratingStorage.test.ts`. |
| Legacy locale and prompt state | Seed `openscreen-locale` and/or `openscreen-system-language-prompt-seen`, with their Showhow equivalents absent. | Copy legacy values to the current keys, retain legacy values, suppress an already-seen language prompt, and write prompt state only to the Showhow key. | Automated unit coverage in `src/contexts/I18nContext.test.tsx`, `src/i18n/config.ts`, and `src/lib/migratingStorage.test.ts`. |
| Legacy OPFS source cache | Put the requested media only under `openscreen-source-cache`. Also exercise current-and-legacy collisions and failed copy-forward. | Prefer `showhow-source-cache`; otherwise read legacy media, copy it forward when possible, and leave the legacy entry intact. A copy failure still returns the readable legacy file. | Automated unit coverage in `src/lib/exporter/localSourceFile.test.ts`. |
| Legacy project import | Open or drop a valid `.openscreen` project, then invoke Save. | Accept the legacy file for reading, but do not overwrite it; the first save uses Save As and offers only `.showhow`. | Automated policy, IPC, and drop-flow coverage in `electron/projectFilePolicy.test.ts`, `src/lib/projectFilePolicy.test.ts`, and `src/components/video-editor/EditorEmptyState.test.tsx`. A real Electron dialog round trip remains a Plan 3 acceptance action. |
| New project reopen | Save a project as `.showhow`, then reopen or drop it. | Save directly to the current path and accept `.showhow` through open and drop flows. | Automated policy and drop-flow coverage in the project policy and empty-state tests. A real save/quit/reopen workflow remains a Plan 3 acceptance action. |
| Electron profile migration | Seed one of `Openscreen`, `OpenScreen`, or `openscreen`; separately test an existing Showhow profile and a failed copy. | Prefer an existing Showhow profile. Otherwise copy a legacy profile atomically without deleting it; if copying fails, use the legacy profile for that launch without leaving partial current data. | Automated filesystem coverage in `electron/userDataMigration.test.ts` and bootstrap-order coverage for `electron/bootstrap.ts`. No packaged-app profile migration was performed. |
| New and legacy instance locks | Exercise no locks, a live Showhow lock, a live legacy lock, stale locks, and a partial-acquisition/PID-write failure. | Acquire both `showhow-single-instance` and `openscreen-single-instance` locks atomically; either live lock blocks a second instance; rollback releases only locks owned by the failed attempt. | Automated filesystem coverage in `electron/singleInstanceLock.test.ts`. No two-process packaged-app smoke test was performed. |
| macOS capture override | Test `SHOWHOW_SCK_CAPTURE_EXE`, then only `OPENSCREEN_SCK_CAPTURE_EXE`. | Prefer the Showhow override; use the legacy override only when the current value is empty or absent. | Automated identity and runtime-consumer guards in `electron/native-bridge/helperIdentity.test.ts`. |
| macOS cursor override | Test `SHOWHOW_MAC_CURSOR_HELPER_EXE`, then only `OPENSCREEN_MAC_CURSOR_HELPER_EXE`. | Prefer the Showhow override; retain the legacy variable as fallback input. | Automated identity and runtime-consumer guards in `electron/native-bridge/helperIdentity.test.ts`. |
| Windows capture override | Test `SHOWHOW_WGC_CAPTURE_EXE`, then only `OPENSCREEN_WGC_CAPTURE_EXE`. | Prefer the Showhow override; retain the legacy variable as fallback input. | Automated identity, runtime-consumer, and smoke-script source guards in `electron/native-bridge/helperIdentity.test.ts`. |
| Windows cursor override | Test `SHOWHOW_CURSOR_SAMPLER_EXE`, then only `OPENSCREEN_CURSOR_SAMPLER_EXE`. | Prefer the Showhow override; retain the legacy variable as fallback input. | Automated identity and runtime-consumer guards in `electron/native-bridge/helperIdentity.test.ts`. |
| Packaged macOS capture helper | Resolve packaged candidates with no override. | Try `showhow-screencapturekit-helper` before `openscreen-screencapturekit-helper`. | Automated candidate-order coverage in `electron/native-bridge/helperIdentity.test.ts`; current macOS helpers also built successfully in Plan 2 Task 6. Packaged lookup remains a Plan 3 app inspection. |
| Packaged macOS cursor helper | Resolve packaged candidates with no override. | Try `showhow-macos-cursor-helper` before `openscreen-macos-cursor-helper`. | Automated candidate-order coverage in `electron/native-bridge/helperIdentity.test.ts`; current macOS helpers also built successfully in Plan 2 Task 6. Packaged lookup remains a Plan 3 app inspection. |
| Packaged Windows capture helper | Resolve packaged candidates with no override. | Try `showhow-wgc-capture.exe` before `wgc-capture.exe`. | Automated candidate-order and script-integration coverage in `electron/native-bridge/helperIdentity.test.ts`. A Windows build and real smoke test remain required on Windows. |
| Packaged Windows cursor helper | Resolve packaged candidates with no override. | Try `showhow-cursor-sampler.exe` before `cursor-sampler.exe`. | Automated candidate-order coverage in `electron/native-bridge/helperIdentity.test.ts`. A Windows build and real smoke test remain required on Windows. |

The standalone diagnostic tool additionally prefers `SHOWHOW_HELPER_EXE` and accepts
`OPENSCREEN_HELPER_EXE` as its legacy fallback. Its selection order and live override invocation
were exercised in Plan 2 Task 6.

## Native platform result

`npm run build:native:mac` passed on Apple silicon during Plan 2 Task 6 and produced executable
Showhow ScreenCaptureKit and cursor helpers in the ignored native output directory. The existing
Swift deprecation warning for `AVCaptureDevice.devices(for:)` did not fail the build. This proves
compilation, not packaged discovery or a real capture session.

The Windows CMake build and physical Windows recording/cursor smoke test were not available on this
macOS host. Source-level tests verify target names, output paths, environment fallback order, and
the Windows-only skip behavior; a real Windows build and smoke test remain a platform follow-up.

## Automated gate on 2026-07-17

The gate ran with Node 22.22.1 and npm 10.9.4:

- `npm run test`: passed, 59 files and 449 tests.
- `npm run test:browser`: after the documented `npm run test:browser:install`, passed, 2 files and
  6 tests. Vitest printed a post-run esbuild `The build was canceled` cleanup message, but the test
  command exited successfully with all tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed, 372 files checked.
- `git diff --check`: passed.

## Diagnostic inventories deferred to Plan 3

`npm run i18n:check` exited 1. The exact categories are missing keys in non-English `dialogs.json`,
`editor.json`, `launch.json`, `settings.json`, `shortcuts.json`, and `timeline.json`, plus obsolete
extra settings keys under `annotation` or `links`. Plan 3 Task 3 owns locale synchronization and
visible product copy; none of this runtime compatibility task's files are locale files.

`npm run branding:check` exited 1 with 419 unclassified matches. The diagnostic-red categories are:

- active visible copy, translations, links, diagnostics labels, and inherited image references;
- package, bundle, Nix, environment-example, entitlement, preview-script, and release-workflow
  identity;
- inherited icon and asset filenames;
- dated plans/specifications, attribution, upstream-import instructions, tests/fixtures, harness
  history, and an inherited nested worktree record;
- intentional Plan 2 compatibility readers for project extensions, storage keys, profile names,
  instance locks, native environment variables, and helper candidates.

Plan 3 Tasks 2–4 own the first three active identity categories and Plan 3 Task 5 owns the final
green branding gate. They were deliberately not added to the compatibility allowlist.

Within files changed by Plan 2, production OpenScreen identifiers that belong to the compatibility
migration are read-only inputs: legacy project extensions, storage keys, profile candidates, the
legacy instance lock, legacy native environment variables, and legacy helper filenames. Other
matches in those same broad files—visible accessibility text, diagnostic filenames, inherited
images, and localized product copy—remain active Plan 3 work and are not classified as compatibility
or allowlisted here. `OPENSCREEN_MAC_HELPER_ARCHS` is an inherited CI build control, not a runtime
product identifier, and is likewise left for the Plan 3 package/release pass.
