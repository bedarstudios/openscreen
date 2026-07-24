# Showhow — retained legacy identifiers

Showhow began as a fork of [OpenScreen](https://github.com/getopenscreen/openscreen)
(MIT). This file exists for one purpose: to record **which inherited
identifiers are deliberately kept, and why**, so nobody "fixes" one and breaks
a user's data.

Everything else has its own home:

| Topic | Document |
|---|---|
| Bundle contract, save paths, transcripts | `docs/architecture/showhow-bundles.md` |
| Importing fixes from the source project | `UPSTREAM.md` |
| Attribution | `NOTICE.md` |
| Commands, layout, conventions | `AGENTS.md` |
| Enforcement of this policy | `config/branding-allowlist.json`, `npm run branding:check` |

## App identity — what was renamed, and what deliberately was not

The app presents as **Showhow** (`productName: "Showhow"`,
`appId: "com.bedarstudios.showhow"` in `electron-builder.json5`). Three things
were left on the OpenScreen name **on purpose**:

- **`.openscreen` project file extension** (`PROJECT_FILE_EXTENSION`,
  `electron/ipc/handlers.ts`). A file extension is a data format, not branding.
  Renaming it makes every saved project invisible to the open dialog, and
  `src/components/video-editor/EditorEmptyState.tsx` hardcodes
  `.endsWith(".openscreen")` for drag-and-drop.
- **`package.json` `name: "openscreen"`** — the npm package is private and never
  published; renaming it only adds upstream merge noise. But see the userData
  note below: this field is not inert, because Electron falls back to it.
- **The Nix module API** (`programs.openscreen.enable`, `nix/*.nix`). That's a
  public interface for upstream's users. `startupWMClass` *was* updated, because
  Electron derives it from `productName` and a mismatch breaks the Linux
  desktop entry.

**Renaming `productName` or `appId` is not free.** `appId` is the macOS bundle
identifier, so changing it resets TCC: Screen Recording and Accessibility must
be granted again from scratch. `productName` determines
`app.getPath("userData")`, so it moves
`~/Library/Application Support/Openscreen` → `.../Showhow`, orphaning
`recordings/` (raw session scratch), `shortcuts.json`, and `Preferences`.

**Dev and packaged builds now use different userData directories.** Electron
takes the app name from `productName` in the app's `package.json`, and falls back
to `name` when it is absent. `productName` lives in `electron-builder.json5`, not
`package.json`, so:

| | app name | userData |
|---|---|---|
| `npm run dev` | `name` → `openscreen` | `~/Library/Application Support/openscreen` |
| packaged | `productName` → `Showhow` | `~/Library/Application Support/Showhow` |

This is a consequence of keeping `package.json` `name` on the old value, and it
is worth knowing before debugging anything that reads userData: shortcuts,
`Preferences`, renderer `localStorage` (so every `openscreen_*` storage key), and
the `recordings/` scratch directory. A dev run will not see what a packaged run
wrote, and vice versa. Adding `"productName": "Showhow"` to `package.json` would
collapse the two — at the cost of orphaning the dev directory that currently
holds real data.

**Showhow bundles are unaffected by any of this.** `SHOWHOW_RECORDINGS_ROOT` is
`os.homedir()/Showhow/Recordings` — deliberately derived from `$HOME`, never
from the app name, so the real deliverable can't be orphaned by a rebrand.

## One more name that must not change

**`<video path>.cursor.json`.** The inherited editor resolves cursor telemetry
purely by that naming convention. Renaming it breaks the cursor overlay
*silently* — no error, no missing file, just no cursor. It is not branding and
it is not internal; it is the contract between the recorder and the editor.

## Before you rename anything else

Run `npm run branding:check`. It fails on any inherited-brand reference that is
not classified in `config/branding-allowlist.json`, with a stated reason per
file. If your change makes the gate fail, the question is whether the reference
is *compatibility* (keep it, classify it) or *branding* (change it) — not
whether to silence the check.

