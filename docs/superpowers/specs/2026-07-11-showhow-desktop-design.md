# Showhow Desktop -- Design Spec

**Date:** 2026-07-11
**Status:** Approved by Mohamed (interview, mock, assumptions, and design sections all signed off)
**Supersedes:** the extension-only roadmap in `.planning/ROADMAP.md` (phases 3-5 will not be built as planned)

## What this is

Showhow pivots from a standalone Chrome extension to a desktop screen recorder
(a fork of [OpenScreen](https://github.com/getopenscreen/openscreen), MIT) that
turns recordings into step-by-step workflow docs and agent-ready bug-report
bundles. The Chrome extension becomes a capture companion, not a product.

Three core features:

1. **Screen recording** -- full OpenScreen feature set, kept intact: screen/window
   capture, mic + system audio, webcam PiP, auto/manual zoom, cursor effects,
   on-device captions, backgrounds, motion blur, per-segment speed, annotations,
   MP4/GIF export.
2. **Automated workflow docs** -- after recording, "Create workflow doc" generates
   a Loom-style doc: screenshot + click marker + instruction + timestamp chip per
   step, no AI required.
3. **Agentic handoff** -- every recording is stored as a self-contained folder an
   AI agent can consume directly (video + transcript + steps + screenshots).
   Record a bug walkthrough, copy the path, paste it to Claude Code.

## Decisions locked in brainstorm (2026-07-11)

- **Full desktop capture** (VS Code, terminal, native apps), not browser-only.
- **Two-tier docs:** browser recordings get semantic DOM steps (exact labels via
  the extension); desktop recordings get OS-click frame grabs with the nearest
  voiceover sentence as the instruction. One unified UI -- the tier difference
  shows only in step content, never as separate modes/tabs.
- **Pivot now:** extension phases 3-5 (screenshots via captureVisibleTab as a
  standalone flow, editor, export) are dead as standalone features. Phase 1-2
  capture work (listeners, labeling, redaction, SPA nav, filtering) carries over.
- **Folder bundle, not export:** recordings are natively stored as agent-ready
  folders. No "export bundle" feature; the only UI is Copy path.
- **Personal tool first:** macOS 13+, unsigned, run from source. Public later.
- **Fork OpenScreen** (approach A) -- keep all features, add the Showhow layer.
  Fresh-build (B) and sidecar (C) rejected: B redoes months of native capture
  work, C kills the unified app experience.

### Signed-off assumptions

1. Fork OpenScreen despite inheriting an unfamiliar Electron codebase; upstream
   updates become manual merges.
2. Transcription is local and free (OpenScreen's on-device caption pipeline);
   accuracy below cloud ASR is accepted.
3. Desktop-tier steps come from a global OS click hook (macOS accessibility
   permission). Keyboard-only actions produce no step unless narrated.
4. Voiceover-to-step matching is a timestamp-proximity heuristic, no AI;
   occasional wrong-neighbour matches accepted.
5. Share links (showhow.link in the mock) are V2 -- they imply a hosted backend,
   which contradicts free/local-only. Share button parked.
6. Browser recordings also run through the desktop app: the app records video,
   the extension streams semantic steps to it. The extension is no longer
   standalone; its popup becomes pairing/status only.

Silent defaults: Electron stays (no Tauri rewrite); recordings at
`~/Showhow/Recordings/YYYY-MM-DD_slug/`; macOS 13+ only; minimal doc editing in
V1; light mode default.

## Architecture

Three components, one contract.

### Showhow Desktop (the OpenScreen fork)

- **Main process** (`/electron`): existing capture pipelines untouched. Added:
  - recording-session manager -- creates the recording folder, writes artifacts
  - global click listener during recording (macOS accessibility permission;
    check whether OpenScreen's cursor/zoom tracking already surfaces click
    events before adding a new hook)
  - localhost WebSocket server for the extension bridge
- **Renderer** (`/src`, React + Vite + Tailwind): existing recorder + video
  editor untouched for V1. Added: Library sidebar + Workflow Doc view, built to
  the approved mock and design system.

### Showhow Extension (companion)

- Keeps Phase 1-2 capture work: capture-phase click/input/change listeners,
  dom-accessibility-api labeling, capture-time redaction, SPA nav detection,
  meaningful-action filtering, captureVisibleTab screenshot machinery.
- Popup rebuilt: paired/unpaired status + recording indicator only. Start/stop
  lives in the desktop app. The in-page floating toolbar is retired.
- Steps stream live to the desktop app over the local WebSocket.

### Doc engine (in the desktop app)

- Browser tier: steps arrive from the extension (label, ts, coords, redaction
  flag, screenshot).
- Desktop tier: OS click events -> frame extracted from video at that timestamp
  + transcript segment nearest the click.
- Transcript: caption pipeline output written as timestamped `transcript.txt`.
- Generation is derived and re-runnable: inputs are video + steps.json +
  transcript; a failed run can always be retried without touching sources.

### Two load-bearing design decisions

- **Screenshots differ by tier.** Desktop steps: frames extracted from the video
  at click timestamps, marker drawn at screen coords (screen coords == video
  coords). Browser steps: the extension's captureVisibleTab screenshots --
  pre-action page state, exact viewport-coord markers, no fragile page-to-video
  pixel mapping through window chrome and display scaling.
- **Clock sync is a first-class requirement.** On recording start the app sends
  its recording-start epoch to the extension; every step carries an offset from
  it. Without the handshake, timestamp chips drift and the doc engine extracts
  wrong frames.

## Data model: the folder contract

```
~/Showhow/Recordings/2026-07-11_upload-product-shopify/
  video.mp4          -- full recording, audio included
  transcript.txt     -- [0:04] timestamped segments
  steps.json         -- source of truth: label, ts, coords, tier, redaction flag
  steps.md           -- human/agent-readable doc rendered from steps.json
  screenshots/       -- step-01.png ... (marker burned in)
  meta.json          -- title, source (browser/desktop), duration, app/urls, created
```

- The folder IS the recording: delete the folder, it leaves the library.
- The app renders its doc view from `steps.json`; `steps.md` is regenerated on
  every edit so the agent-facing copy never goes stale.

## UI surfaces (V1)

- **Library + Workflow Doc view** -- built to the approved mock:
  `assets/design/approved-mock/Showhow Desktop.dc.html`. Sidebar library
  (globe/monitor icons, accent-100 active row), video player, title + source
  tag, folder path row with Copy path, numbered steps with timestamp chips and
  reveal-typed-text toggle, empty/generating states as mocked.
- **Design system** -- `assets/design/design-system/Showhow Design System.dc.html`
  is the styling source of truth: Instrument Serif (wordmark + doc titles only),
  Public Sans body, ui-monospace for paths/timestamps/code; cream #FFFCF7 / ink
  #2F2F2F / sage #82B09A / forest #142F18 / signal #6BFF7E; accent-2 tags
  Desktop recordings and appears nowhere else; signal green marks live/record
  state only.
- **Recorder + editor** -- OpenScreen UI as-is; reskin is a later pass.
- **Doc editing in V1** -- inline title + instruction edits, step delete.
  No reorder, no annotation. Timestamp chips seek the built-in player.
- **Parked:** Share (V2, needs backend), PDF/HTML export (fast-follow, pdf-lib
  plan still valid).

## Privacy and failure behaviour

- Redaction is capture-time in the extension: password values never leave the
  page; typed text stored redacted with per-step reveal.
- `steps.md` always renders the redacted form. Revealing in the UI never
  rewrites steps.md unless "include revealed text" is toggled per step -- the
  agent bundle defaults to safe.
- Extension unpaired / WebSocket drops mid-recording: video keeps recording;
  recording is marked "steps unavailable -- browser companion wasn't connected";
  doc falls back to desktop tier. Never lose video because the doc layer failed.
- No accessibility permission: recording still works; doc creation explains
  clicks can't be captured and offers a transcript-only doc.

## V1 cut line and build order

V1 = record (all OpenScreen features) -> folder bundle -> workflow doc -> copy
path to agent.

1. **Fork orientation + folder bundle** -- fork builds and runs locally; every
   recording saves the full folder contract (video, meta, transcript).
2. **Desktop-tier doc engine** -- click hook, frame extraction, transcript
   matching, steps.json/steps.md. The bug-report use case works end to end here.
3. **Library + doc view UI** -- the mock made real, reading from the folders.
4. **Extension bridge** -- pairing, clock sync, step streaming, browser-tier
   docs with captureVisibleTab screenshots.
5. **Polish pass** -- doc editing, redaction reveal UI, empty/error states.

Each phase independently useful to Mohamed. Not in V1: share links, PDF/HTML
export, Windows/Linux, recorder/editor reskin, MCP server, step
reorder/annotations.

## Testing

- Plans follow `.agents/rules/planning-quality.md`: MUST / MUST NOT / REASON /
  DONE WHEN per risky task, exact call sequences for non-obvious paths.
- Example done-condition: "record 30s of VS Code with narration; folder contains
  all six artifacts; each steps.md timestamp within 1s of the click visible in
  the video."
- Product acceptance test (end of phase 2): record a real bug walkthrough, point
  Claude Code at the folder path, and it diagnoses the bug without extra
  explanation. That test is the product thesis.
- Extension capture logic keeps its existing Phase 1-2 verification approach.

## Open questions for the planning phase (not blockers)

- Where OpenScreen's caption pipeline runs and what format it emits -- confirm
  it can produce timestamped transcript.txt offline on macOS.
- Whether OpenScreen's cursor tracking already captures click events reusable
  for the desktop-tier hook, or a CGEventTap must be added.
- Repo strategy: new repo for the fork (`showhow-desktop`) with the extension
  repo referenced, vs monorepo. Default: separate fork repo, decide at fork time.
