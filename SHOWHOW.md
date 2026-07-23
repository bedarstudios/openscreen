# Showhow (fork of OpenScreen)

This repo is **Showhow Desktop**: [OpenScreen](https://github.com/getopenscreen/openscreen)
(MIT) plus a workflow-doc and agent-handoff layer. It records screen (and
optionally webcam) video and persists every recording as a self-contained
**bundle folder** designed to be handed straight to an AI agent ("what
happened in this recording?") or, in phase 2, turned into a step-by-step
doc automatically.

Upstream: https://github.com/getopenscreen/openscreen (MIT license).

## Fork deltas (phase 1)

### `electron/showhow/bundle.ts` -- the bundle-folder module

`createRecordingBundle()` moves a finished recording's files into a bundle
folder and writes its manifest. Folder contract, one folder per recording,
under `~/Showhow/Recordings/YYYY-MM-DD_HHMMSS-recording/`:

```
~/Showhow/Recordings/2026-07-12_143022-recording/
├── video.mp4                   # native macOS recording (WebM fallback stays video.webm)
├── video.mp4.cursor.json       # cursor telemetry (present only if captured)
├── webcam.webm                 # optional, present only if a webcam was recorded
├── transcript.txt              # Whisper transcript, written after save (fire-and-forget)
├── meta.json                   # manifest -- see ShowhowMeta in bundle.ts
└── screenshots/                # empty in phase 1; filled by the phase-2 doc engine
```

`meta.json.steps` is `null`. **This is a placeholder, not a bug** --
`steps.json`/`steps.md` and the contents of `screenshots/` are phase 2 (the
doc engine) scope, not phase 1. Phase 1 only guarantees the folder shape and
the four real artifacts above.

### Three real save-completion paths -- not one

The original phase-1 plan assumed a single save-completion path
(`storeRecordedSessionFiles`, reached via `store-recorded-session`) and wired
bundling into it alone. **Manual testing during the build proved this
incomplete**: on macOS, OpenScreen's default recording path is native
ScreenCaptureKit capture, which completes through an entirely separate IPC
handler and never touches `storeRecordedSessionFiles`. There are, in fact,
**three** independent places a macOS recording can finish saving, and
`createRecordingBundle` is now called from all three (see
`electron/ipc/handlers.ts`):

1. **`storeRecordedSessionFiles`** (via the `store-recorded-session` IPC
   handler) -- the browser-MediaRecorder fallback path, used only when
   native capture is unavailable.
2. **`stop-native-mac-recording`** -- the actual default macOS recording
   path (native ScreenCaptureKit). This is what most real recordings on
   this machine go through, and it was the path that surfaced the gap:
   the first manual acceptance recording landed as flat files with no
   bundle, no `meta.json`, no `screenshots/`, because bundling code never
   ran on this path at all.
3. **`attach-native-mac-webcam-recording`** -- the native webcam-attach
   path, hooked for consistency so OpenScreen's webcam PiP feature keeps
   producing a bundle when a webcam was recorded alongside native macOS
   capture.

All three call `createRecordingBundle` **best-effort and fail-open**: a
bundling error is caught, logged, and the handler falls back to the
flat/unbundled session it would have produced before this fork -- it never
rejects the save. A recording is never lost because bundling failed.

Native Windows capture (`stop-native-windows-recording`) has the identical
shape but is **intentionally not hooked** -- V1 scope is macOS-only.

### `src/lib/showhow/` -- transcript generation

- `transcriptFormat.ts` -- pure formatting of Whisper segments into
  timestamped transcript text.
- `generateTranscript.ts` -- `generateTranscriptForBundle(bundleDir,
  videoFileUrl)`. The save path persists this pending job on the recording
  session; the editor claims it after the recorder window closes, so local
  Whisper work survives the window transition. It extracts mono16k audio from the saved video, runs it
  through the existing captioning/Whisper pipeline, formats the result, and
  writes it via the `showhow:write-transcript` IPC handler
  (`electron/ipc/handlers.ts`). That handler validates the renderer-supplied
  `bundleDir` resolves *inside* `SHOWHOW_RECORDINGS_ROOT` before writing
  `transcript.txt` -- rejects anything else. On any failure (extraction,
  transcription, or the IPC write itself) the bundle still ends up with a
  `transcript.txt` containing a `(transcription failed)` marker rather than
  a missing file, so bundle shape stays guaranteed.

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

## Conventions

- All Showhow code lives in `electron/showhow/` and `src/lib/showhow/`.
- Commits are prefixed `feat(showhow):` to keep upstream merges reviewable.
- **Never break the `<video path>.cursor.json` convention.** The existing OpenScreen editor
  loads cursor telemetry by the `${videoPath}.cursor.json` naming
  convention -- renaming it breaks the cursor overlay silently.

## Lesson learned

When adding a new save-path hook in the future (e.g. phase 2's screenshot
capture), **grep for every `ipcMain.handle` registration that writes a
`RecordingSession` + `.session.json` manifest before assuming there's only
one.** There are at least three on macOS (`store-recorded-session`,
`stop-native-mac-recording`, `attach-native-mac-webcam-recording`), plus a
fourth with the identical shape on Windows (`stop-native-windows-recording`)
that is intentionally left unhooked (out of scope, macOS-only V1). Static
code reading alone found the first path and stopped there during phase 1
planning -- it took a real manual recording to reveal that native
ScreenCaptureKit capture, not the browser MediaRecorder fallback, is what
actually runs by default on macOS. Cross-check any "the save path" claim in
a plan against a runtime recording, not just a code read.

## Upstream sync

```bash
git fetch upstream && git merge upstream/main
```

Conflicts in `electron/ipc/handlers.ts` should be resolved by **preserving
the bundle + transcript blocks appended at the tail of each of the three
hooked handlers** (`storeRecordedSessionFiles`, `stop-native-mac-recording`,
`attach-native-mac-webcam-recording`) -- those blocks are Showhow additions,
not upstream code, and should win over upstream's version of those
functions' tails.
