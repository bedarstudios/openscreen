# Showhow

Showhow is a free, MIT-licensed, local-first desktop screen recorder that turns recordings into
workflow documentation and agent-ready handoff folders. It is pre-1.x software and is not
production-grade; expect rough edges and breaking changes while the product is built.

## What Showhow does

Showhow keeps its inherited recorder and editor foundation while adding a documentation workflow.
The V1 path is:

**record → folder bundle → workflow doc → copy path**

A recording is saved as a self-contained folder containing the video, local transcript, metadata,
cursor telemetry when available, and—once the desktop doc engine lands—generated steps and
screenshots. Copying that folder path gives a person or an AI coding agent the complete handoff.

## Current status

Phase 1 is complete: finished recordings are persisted as folder bundles under
`~/Showhow/Recordings/`, with a manifest, transcript, screenshots directory, optional webcam, and
cursor telemetry when captured. The workflow-doc engine, library and workflow UI, extension
bridge, and final editing polish remain planned work; see [ROADMAP.md](./ROADMAP.md).

The inherited recorder and editor remain available, but Showhow's standalone identity migration is
still in progress. Current package names, application labels, icons, and some persisted identifiers
may retain legacy names until their compatibility-safe migration is completed.

## Requirements

- macOS 13+ for the current Showhow V1 development target
- Node.js 22.22.1
- npm 10.9.4
- Xcode Command Line Tools when building the native macOS capture helper

## Development

```bash
git clone https://github.com/bedarstudios/showhow-desktop.git
cd showhow-desktop
npm install
npm run dev
```

Build the native macOS helper when working on capture or running a native recording locally:

```bash
npm run build:native:mac
```

## Verification

```bash
npm run test
npm run test:browser
npx tsc --noEmit
npm run lint
npm run i18n:check
npm run branding:check
```

Browser tests require a one-time `npm run test:browser:install`. Native capture changes also require
a manual smoke test on the affected operating system because CI cannot validate the macOS and
Windows helpers end to end.

## Repository policy

Showhow owns its roadmap, releases, branding, and architecture. Its source ancestor is not an
operational parent. Do not configure a permanent source remote or perform full branch merges.
Individually reviewed fixes may be imported using [UPSTREAM.md](./UPSTREAM.md), followed by the
affected verification suite and branding audit.

New projects will use `.showhow`; compatibility with legacy `.openscreen` projects must remain
explicit and tested throughout that migration.

## Attribution

Showhow contains code derived from an earlier MIT-licensed project. It is independently developed
and operated. See [NOTICE.md](./NOTICE.md) for source provenance and [UPSTREAM.md](./UPSTREAM.md) for
the selective-intake policy.

## License

Showhow is free software licensed under the [MIT License](./LICENSE) for personal and commercial
use. No paid tier, premium feature, or upsell is part of the product direction.
