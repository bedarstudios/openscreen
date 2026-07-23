<p align="center">
  <img src="public/openscreen.png" alt="Showhow" width="64" />
</p>

# <p align="center">Showhow</p>

<p align="center"><strong>A screen recorder that hands your recordings to an AI agent.</strong></p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/bedarstudios/openscreen?style=for-the-badge&label=License" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/status-pre--v1-orange?style=for-the-badge" alt="Status" />
</p>

> [!WARNING]
> Showhow is pre-v1 and built in the open for one user first. Expect bugs, rough edges, and breaking changes. The Showhow layer is macOS-only today.

## What this is

Every screen recorder gives you a video. A video is a terrible thing to hand a coding agent — it can't watch it, and you end up narrating the whole thing again in a bug report.

Showhow makes the recording itself the deliverable. Hit record, hit a bug, stop. Showhow writes a **self-contained folder** to `~/Showhow/Recordings/`, and you hand an agent the folder path. Nothing else.

```
~/Showhow/Recordings/2026-07-12_143022-recording/
├── video.mp4                   # the recording
├── video.mp4.cursor.json       # cursor telemetry
├── webcam.webm                 # optional
├── transcript.txt              # on-device Whisper, timestamped
├── meta.json                   # manifest
└── screenshots/                # one frame per click
```

Later phases add `steps.json` and `steps.md` — a deterministic, numbered walkthrough derived from your clicks and the sentences you said near them. The agent reads the Markdown, looks at the frames, and knows what you did without you writing a word of it.

**It runs entirely on your machine.** The transcript is generated locally with Whisper. Nothing uploads, no account, no cloud, no API key required.

### Two rules the build holds to

**The recorder wins, always.** Every Showhow addition is fail-open. If bundling breaks, transcription fails, or accessibility permission is denied, the recording still saves — you get the plain video and an explanation, never a lost take. A recording is never sacrificed for a feature.

**It stays a good recorder.** Showhow inherits OpenScreen's editor whole: zooms, cursor effects, backgrounds, motion blur, crop/trim/speed, annotations, captions, MP4 and GIF export. If you never touch the Showhow layer, you still have the recorder you'd have used anyway.

## Where it's going

Phase 1 shipped; the doc engine is being built now. The plan is in [ROADMAP.md](./ROADMAP.md), and [SHOWHOW.md](./SHOWHOW.md) has the implementation notes and the fork's architectural contracts.

## Credit and lineage

Showhow is a fork, and almost all of the recorder you're using was written by other people.

- **[OpenScreen](https://github.com/siddharthvaddem/openscreen)** was created by **[Siddharth Vaddem](https://github.com/siddharthvaddem)** and archived after v1.5.0.
- **[Etienne Lescot](https://github.com/EtienneLescot)** continued it, with the original author's approval, at **[getopenscreen/openscreen](https://github.com/getopenscreen/openscreen)** — the upstream this fork tracks.

Showhow is that recorder plus a workflow-doc and agent-handoff layer. All Showhow code is confined to `electron/showhow/` and `src/lib/showhow/`, and commits are prefixed `feat(showhow):`, specifically so upstream stays mergeable and so it's obvious which lines are mine and which aren't.

If you want a polished, cross-platform, general-purpose screen recorder, **use OpenScreen** — it's the better choice and it's excellent. Showhow is a narrower tool aimed at one workflow.

## Installation

Showhow is not yet published as an installer. Build from source:

```bash
npm install
npm run dev
```

Requires Node 22.22.1 and macOS 13+. On first launch, grant **Screen Recording** and **Accessibility** permission in System Settings → Privacy & Security.

For pre-built OpenScreen binaries on macOS, Windows, or Linux, see the [upstream releases](https://github.com/getopenscreen/openscreen/releases).

## License

MIT — see [LICENSE](./LICENSE). Inherited from OpenScreen and staying that way. Free for personal and commercial use, no paid tiers, nothing behind a paywall.
