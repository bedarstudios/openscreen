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
