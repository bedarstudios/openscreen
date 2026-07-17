# Plan 3 Task 3 report: visible Showhow copy and locale parity

## Scope and result

Replaced the released visible product identity with literal `Showhow` across application-menu and
tray fallbacks, editor empty/unsaved states, source-loading and permission copy, the default app
fallback, all 13 locales, and the HTML favicon reference. New project terminology remains
`showhowProject`; `.showhow` precedes `.openscreen`, which appears only in the two localized editor
compatibility explanations.

No binary asset was regenerated: `public/showhow.png` already existed with the approved Task 2
payload and only its references required correction.

Two binding visible-copy dependencies were discovered outside the original Task 3 file map and
approved by the parent agent before modification:

- `electron/ipc/handlers.ts`: two macOS permission-dialog fallback strings changed from OpenScreen
  to Showhow; handler logic is unchanged.
- `src/App.tsx`: the default window-type branch's visible heading changed from Openscreen to
  Showhow; routing and behavior are unchanged.

## RED evidence

Added tests before production/resource edits for:

- actual editor image references (`/showhow.png`),
- Showhow system-language prompt copy,
- application entry-point fallbacks and favicon,
- all-locale exact structural parity,
- absence of the old visible product name in localized values,
- literal Showhow in About, Hide, accessibility, and system-language values,
- canonical `showhowProject` terminology,
- `.showhow` before `.openscreen` and legacy extension placement only in compatibility copy.

Initial focused run:

```text
npm run test -- src/components/launch/LaunchWindow.test.tsx \
  src/components/video-editor/EditorEmptyState.test.tsx \
  src/components/video-editor/UnsavedChangesDialog.test.tsx \
  src/i18n/__tests__/visibleBrandTranslations.test.ts

3 test files failed; 5 tests failed.
Expected failures: old component images, OpenScreen main-process fallbacks/favicon, locale-key drift,
and old visible localized product names.
```

The existing locale checker independently reported the full expected drift across dialogs,
editor, launch, settings, shortcuts, and timeline. A second RED run proved the newly approved
permission fallback guard failed on `electron/ipc/handlers.ts` before those two strings changed.

## GREEN and localization evidence

- Restored exact key parity against English across 7 namespaces and all 12 additional locales.
- Added accurate localized copy for every missing key; retained existing surrounding translations.
- Removed obsolete `annotation.selectAnimation` / `annotation.textAnimation` keys where present and
  obsolete Portuguese `links` keys after moving their translated values to canonical `support`.
- Replaced only the product proper noun inside existing translated values; product names were not
  translated.
- Preserved `.openscreen` solely as an explicitly legacy project extension after `.showhow`.

Focused result:

```text
5 test files passed; 20 tests passed.
```

## Verification

Environment: Node 22.22.1 and npm 10.9.4 through nvm.

- `npx biome check <102 scoped files>`: passed, no fixes required.
- `npm run i18n:check`: passed; all 12 non-English locales match English across 7 namespaces.
- `npm run test -- --reporter=dot`: passed; 62 files, 462 tests.
- `npm run test:browser`: passed; 2 files, 6 tests. Vite printed its known post-run
  `The build was canceled` teardown line after the passing summary.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- `npm run branding:check`: diagnostic matches remain as expected before Task 4.

The unit suite emitted its established intentional diagnostics (WebM fallback, bounded cursor
queue, malformed custom-font fixture, mocked Discord warnings, and jsdom canvas notices); no new
failure was introduced.

## Remaining branding categories

- **Task 4 active identity:** package/app IDs and product name, entitlements and permission metadata,
  environment defaults, release/build artifact labels, Nix package/module identity, preview and
  diagnostic script names, current repository/support URLs, and release-secret migration.
- **Historical/attribution:** NOTICE, UPSTREAM policy, dated plans, preserved harness memory, and
  archived imported worktree records.
- **Compatibility/fallback:** `.openscreen` project readers and fixtures, legacy persistence/cache
  names, and `OPENSCREEN_*` environment inputs retained behind Showhow-first behavior.

No active Task 4 identity was added to the allowlist.

## Commit and concerns

Commit: this report is included in `feat: replace visible product identity with Showhow`; resolve
the immutable SHA with `git rev-parse HEAD` after commit creation.

Concern: translations were reviewed structurally and for preservation/localization quality, but no
native-speaker linguistic review was available for all 12 non-English locales.
