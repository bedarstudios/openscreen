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
