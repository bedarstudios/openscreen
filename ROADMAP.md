# Showhow Roadmap

**North star: record → folder → agent.** You hit record, you hit the bug, you stop. Showhow writes a self-contained folder and you hand a coding agent the path. Nothing else.

This is the plan of record for what ships next. The machine-readable version — issue numbers, dependencies, done-when criteria — lives in [`.bedar/project-plan.yml`](./.bedar/project-plan.yml); this file is the human read of it. Phases gate each other strictly: nothing in phase 3 starts before phase 2 closes.

## Principles

- **The recorder wins, always.** Every Showhow addition is fail-open. Bundling breaks, transcription fails, accessibility is denied — the recording still saves. A take is never lost to a feature.
- **Local only.** Transcription runs on-device. No account, no upload, no API key. That isn't a v1 shortcut; it's the design.
- **macOS first.** V1 targets macOS 13+. Windows and Linux keep working as the inherited OpenScreen recorder, but the Showhow layer isn't hooked there.
- **Stay mergeable with upstream.** Showhow code stays in `electron/showhow/` and `src/lib/showhow/`, commits stay prefixed `feat(showhow):`, so upstream fixes keep flowing in.

## ✅ Phase 1 — Folder bundle *(shipped)*

Every finished macOS recording persists as a recoverable bundle instead of loose files.

- [x] Fail-open bundle persistence across all three macOS save paths
- [x] `meta.json` manifest and cursor telemetry
- [x] On-device Whisper transcript, timestamped, surviving the recorder→editor window transition

## 🔨 Phase 2 — Desktop doc engine *(in progress)*

Turn a recording into a deterministic step-by-step document.

- [x] Extract the marked video frame for each desktop click — [#19](../../issues/19)
- [ ] Generate `steps.json`, `steps.md`, and numbered screenshots by matching nearby transcript sentences to click timestamps — [#20](../../issues/20)
- [ ] Prove the handoff: record a real bug, give an agent only the folder path, confirm it diagnoses it — [#21](../../issues/21)

Regenerating from the same video, transcript, and clicks must produce identical steps. Every `steps.md` timestamp must land within one second of its visible click.

## 📚 Phase 3 — Library and doc view

Make the folders browsable without leaving the app.

- [ ] Local recording library — discover valid bundles, newest first, no second database — [#22](../../issues/22)
- [ ] Workflow doc view — video, numbered screenshots, instructions, seekable timestamp chips, Copy path — [#23](../../issues/23)

## 🌐 Phase 4 — Browser companion bridge

Desktop clicks tell you *where* someone clicked. The browser can tell you *what* they clicked.

- [ ] Desktop bridge — localhost pairing, recording-start clock handshake, safe fallback on disconnect — [#24](../../issues/24)
- [ ] Companion capture — semantic action labels, capture-time redaction, SPA navigation, pre-action screenshots — [#25](../../issues/25)

Start and stop stay desktop-owned. A mid-recording disconnect costs you semantic steps, never video.

## ✨ Phase 5 — V1 polish

- [ ] Safe doc editing — retitle, reword an instruction, delete a step, reveal redacted text per step, regenerate `steps.md` — [#26](../../issues/26)
- [ ] Every empty, generating, and failure state, plus full V1 acceptance on macOS 13+ — [#27](../../issues/27)

Redacted text stays out of the agent-facing Markdown unless explicitly revealed for that step.

## Beyond V1

Not scheduled, not promised — the things worth reconsidering once V1 holds up in daily use:

- Windows support for the Showhow layer (the native capture path already has the identical shape; it's deliberately unhooked)
- Export a bundle as a single shareable file
- Publishing signed macOS builds

## Inherited from upstream

Showhow tracks [getopenscreen/openscreen](https://github.com/getopenscreen/openscreen) and merges its fixes. Recorder and editor bugs — export regressions, GPU encoder fallback, blur regions, Linux/Wayland issues — are upstream's roadmap, not this one. Report them there; they reach Showhow through the merge.
