# Showhow Roadmap

Showhow's V1 path is **record → folder bundle → workflow doc → copy path**. The product remains
free, local-first, and MIT licensed.

## Source order

Roadmap decisions are resolved in this order:

1. The approved [Showhow Desktop design spec](./docs/superpowers/specs/2026-07-11-showhow-desktop-design.md)
   defines the V1 product and cut line.
2. The current [feature backlog](./docs/product/feature-backlog.md) prioritizes post-V1 ideas.
3. This roadmap communicates the resulting delivery sequence; it does not override either source.

## Phase 1: Folder bundle — completed

- Finished recordings are stored under `~/Showhow/Recordings/` as self-contained bundles.
- Bundles include video, `meta.json`, `transcript.txt`, `screenshots/`, optional webcam video, and
  cursor telemetry when captured.
- Transcript work uses the local captioning pipeline and survives the recorder-to-editor window
  transition.
- Bundling is fail-open so a documentation-layer failure never discards a recording.

## Phase 2: Desktop doc engine

- Turn desktop click timestamps into video frame screenshots with click markers.
- Match the nearest transcript segment to each click without requiring a cloud service or AI.
- Generate `steps.json` as source data and regenerate human-readable `steps.md` from it.
- Keep generation derived and repeatable so failures never alter the source recording.

## Phase 3: Library and workflow UI

- Browse recording folders in a desktop library.
- Show the recording, folder path, workflow steps, screenshots, and timestamp navigation together.
- Copy a bundle path for direct handoff to a person or agent.
- Add inline title and instruction editing plus step deletion; keep reorder and annotation out of
  the V1 cut.

## Phase 4: Extension bridge

- Pair the browser companion with the desktop app over a local connection.
- Synchronize clocks and stream semantic browser steps into the active desktop recording.
- Use browser screenshots and exact accessible labels while falling back safely to desktop-tier
  steps if the companion disconnects.

## Phase 5: Polish

- Complete empty, generating, permission-denied, and partial-capture states.
- Finish safe redaction reveal controls and workflow editing details.
- Validate the complete record-save-doc-copy-path flow with a real bug walkthrough.

## Post-V1 backlog

After the V1 phases, prioritize the maintained feature backlog: multi-guide library improvements,
AI-assisted step-text polish through user-provided credentials, screenshot editing, guide branding,
and copy-to-destination formats. Hosted sharing, stale-guide detection, additional browser ports,
and handbook exports remain later work because they add infrastructure or research scope.

## Inherited technical backlog

Inherited recorder/editor work belongs here only when it still affects Showhow's recording path:

- reliability of save and shutdown on native macOS capture;
- cursor alignment for single-window macOS capture;
- Linux/Wayland preview recovery after WebGL context loss;
- software H.264 fallback where hardware encoding is unavailable; and
- restoration and regression coverage for inherited editor features that Showhow still exposes.

These items do not redefine Showhow's product direction. A confirmed data-loss, recording, or
editor regression may take priority over planned product work.
