# Implementation Notes -- Showhow Phase 1

Deviations from `docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md`,
logged as they're discovered mid-build. Nothing is deleted from this file.

## Deviations

### 2026-07-12: Native macOS capture path bypasses bundling entirely

**What changed:** Task 3 wired `createRecordingBundle` into
`storeRecordedSessionFiles` (electron/ipc/handlers.ts), on the assumption that
every finished recording flows through it. Manual acceptance testing (a real
20s recording via the app UI) proved this wrong: on macOS, OpenScreen tries
**native ScreenCaptureKit capture first** (`startNativeMacRecordingIfAvailable`,
src/hooks/useScreenRecorder.ts:1167), and that path's completion handler is a
**separate IPC handler**, `stop-native-mac-recording`
(electron/ipc/handlers.ts:2090-2172), which writes its own session manifest
directly and never calls `storeRecordedSessionFiles`. `store-recorded-session`
(the path Task 3 modified) is only reached via the browser-MediaRecorder
fallback, used when native capture is unavailable.

Result: the manual verification recording landed as flat files in
`~/Library/Application Support/openscreen/recordings/` -- no bundle folder,
no `meta.json`, no `screenshots/` -- exactly the "silent fallback" the
try/catch was designed to produce, except triggered by the wrong root cause
(bundling code never ran at all, not that it ran and failed).

**Why:** the plan and its brief did not account for OpenScreen having two
independent save-completion code paths on macOS (native ScreenCaptureKit vs.
browser MediaRecorder). Static code reading during planning found
`storeRecordedSessionFiles` as *a* completion path; it was not cross-checked
against which path the recorder actually prefers at runtime.

**What was done instead (conservative option):** extend the same bundling
try/catch pattern -- already reviewed and approved in `storeRecordedSessionFiles`
-- to `stop-native-mac-recording` (the primary/default macOS path) and
`attach-native-mac-webcam-recording` (the native webcam-attach path, for
consistency, since OpenScreen's webcam PiP feature must keep working per the
spec's "keep all OpenScreen features" requirement). Same ordering rule applies:
bundle after `writePendingCursorTelemetry`, before the session manifest write;
same fail-open behavior: bundling failure logs and falls back to the
flat/unbundled session, never rejects the IPC call.

Native Windows capture (`stop-native-windows-recording`, handlers.ts ~2000-2070)
has the identical shape but is explicitly out of scope -- spec is macOS-only
for V1 (personal tool, "macOS 13+, unsigned" per the signed-off assumptions).
Left unbundled; noted here so it isn't mistaken for an oversight later.

**Task retroactively affected:** Task 3 (already reviewed/approved based on
code-reading verification only; the manual runtime check that would have
caught this was still pending when the review ran). Re-opened as
Task 3b/fix rather than reverting the approval, since the original diff is
correct as far as it goes -- it's incomplete, not wrong.

### 2026-07-12: Task 4 transcript hook-in follows the same three-path discovery

**What changed:** Task 4's brief (written before the deviation above was
discovered and fixed) assumed `storeRecordedSessionFiles` /
`store-recorded-session` was the only save-completion path and told the
implementer to hook `generateTranscriptForBundle` into `useScreenRecorder.ts`
at its two `storeRecordedSession` call sites only. Per the corrected task
instructions (informed by the deviation above, and by the same-commit fix
that added `bundleDir`/`videoFileUrl` to all three IPC results), the
fire-and-forget transcript call was wired into all three places a macOS
recording save can succeed:

1. The primary `storeRecordedSession` call site (browser-MediaRecorder path,
   `useScreenRecorder.ts` ~line 391), guarded on `result.bundleDir &&
   result.videoFileUrl`.
2. The nested `storeRecordedSession` call inside `finalizeNativeWindowsRecording`
   (used only when a webcam was recorded alongside native Windows capture),
   guarded on `stored.bundleDir && stored.videoFileUrl`. The Windows-native
   `stopNativeWindowsRecording` result itself is untouched and unhooked --
   that result type has no `bundleDir`/`videoFileUrl` fields since native
   Windows bundling is explicitly out of scope for V1 (macOS-only spec).
3. `finalizeNativeMacRecording`'s final save state: tracked
   `finalBundleDir`/`finalVideoFileUrl` starting from `stopNativeMacRecording`'s
   result, overwritten by `attachNativeMacWebcamRecording`'s result when a
   webcam was attached (since that call's result reflects the final bundle,
   not the screen-only one), then fired once right before
   `clearNativeRecordingState()`.

**Why:** the native macOS path (default on macOS) never goes through
`storeRecordedSession`, so hooking only those two call sites would mean the
primary recording path -- and thus the vast majority of real usage -- never
gets a transcript.

**Task retroactively affected:** none -- Task 4 was corrected before
implementation started, so no rework needed.

### 2026-07-15: Live acceptance exposed renderer-lifetime and container mismatches

**What changed:** A real native macOS recording showed that ScreenCaptureKit writes MP4,
while the bundle module renamed every video to `video.webm`. It also showed that starting
Whisper fire-and-forget in the recorder renderer does not survive `switchToEditor()`, which
destroys that renderer before transcription completes.

**What was done instead:** Preserve the source container as `video.mp4` or `video.webm`,
including the matching cursor telemetry name. Persist the pending Showhow transcript job on
`RecordingSession`; the editor renderer claims it after the window transition and clears the
pending fields only after the transcript write completes.

### 2026-07-15: Startup activation raced IPC registration

**What changed:** Live automation reproduced a HUD window whose renderer called IPC before
the handlers existed. Startup awaited proactive microphone permission, while a second-instance
activation could create the HUD during that wait.

**What was done instead:** Gate window activation until startup registration is complete and
request microphone access only when the user enables microphone capture. Regression coverage
verifies that an early activation is deferred until readiness.

## Phase 1 acceptance -- 2026-07-15

- Recorded 45 seconds of the full display through native ScreenCaptureKit with system audio.
- Played a deterministic macOS text-to-speech phrase containing "green lighthouse",
  "seven forty two", "local speech transcription", and "agent ready folder".
- Verified the recording opened in the editor with a 45-second duration.
- Verified `~/Showhow/Recordings/2026-07-15_100533-recording/` contains `video.mp4`,
  `video.mp4.cursor.json`, `transcript.txt`, `meta.json`, and `screenshots/`.
- Verified `transcript.txt` contains timestamped recognition of the deterministic phrase.
- Verified `meta.json` identifies `video.mp4` and `video.mp4.cursor.json` accurately.
- Verification: 45 test files / 328 tests passed; `tsc --noEmit` passed; Biome checked
  346 files with no errors.

## Workspace retirement -- 2026-07-16

### Generated design exports are documentation, not application source

**What changed:** Moving the approved mock and design-system exports into `docs/design/`
caused the pre-commit hook to lint their generated JavaScript and JSON. The exports contain
bundled runtime patterns that intentionally violate the application Biome rules.

**What was done instead:** Added the narrow `!docs/design/**` exclusion to
`biome.json`'s file set. The exact failing `lint-staged` path then passed, and the full test
suite remained green. The generated exports were preserved byte-for-byte rather than rewritten.

### The parent feature backlog was OS-tracked

**What changed:** The plan treated `Projects/web/showhow/feature-backlog.md` as parent-owned
material but did not initially list its tracked deletion in the OS commit.

**What was done instead:** Staged the deletion explicitly alongside the nine planned OS
alignment files. Unrelated pre-existing OS changes remained unstaged.
