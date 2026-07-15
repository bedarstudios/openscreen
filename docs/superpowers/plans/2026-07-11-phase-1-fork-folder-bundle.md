# Showhow Phase 1: Fork Orientation + Folder Bundle -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The OpenScreen fork builds and runs locally on macOS, and every finished recording is persisted as an agent-ready Showhow bundle folder (`video.webm`, `video.webm.cursor.json`, `transcript.txt`, `meta.json`, `screenshots/`) under `~/Showhow/Recordings/`.

**Architecture:** OpenScreen already funnels every finished recording through one main-process function, `storeRecordedSessionFiles` (`electron/ipc/handlers.ts:2254`). We add a new `electron/showhow/bundle.ts` module that relocates the artifacts that function produces into a per-recording bundle folder and writes `meta.json`, then wire it in at the end of that function. Transcription reuses OpenScreen's existing in-renderer Whisper pipeline (`src/lib/captioning`) fired as a background job after save, writing `transcript.txt` via one new narrow IPC handler.

**Tech Stack:** Electron 33+, TypeScript, Vite, React 18, Vitest, Biome. Node pinned by `engines`: **22.22.1** (npm 10.9.4). macOS ScreenCaptureKit helper built via Swift (`npm run build:native:mac`).

**Spec:** `Projects/web/showhow/app/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md`

## Feedback addressed

PLAN-FEEDBACK.md: none open (no PLAN-FEEDBACK.md exists in this repo).

## Spec deviations decided at plan time

1. **`video.webm`, not `video.mp4`.** OpenScreen's capture pipeline produces WebM; MP4 only exists as an editor export. Transcoding at save would add minutes and a second copy of multi-GB files. Agents read WebM fine (ffmpeg-based tooling). The folder contract's video artifact is `video.webm`.
2. **Cursor telemetry keeps its convention name.** The bundle contains `video.webm.cursor.json`, NOT a renamed `cursor.json`.
   REASON: the editor loads telemetry by the `${videoPath}.cursor.json` convention (`electron/ipc/handlers.ts:836`); renaming silently breaks the cursor overlay.
3. **`steps.json`/`steps.md`/screenshot contents are Phase 2.** Phase 1 creates the empty `screenshots/` dir and `meta.json` carries `"steps": null` so Phase 2 has a slot to fill.

## Global Constraints

- Node `22.22.1` / npm `10.9.4` exactly (package.json `engines`); use `nvm use 22.22.1` or equivalent before any npm command.
- macOS 13+ only. Do not touch `/electron/native`, `/electron/native-bridge`, or any capture pipeline code.
- No new npm dependencies in Phase 1. Everything needed exists in-tree.
- Every OpenScreen feature must keep working: recorder, editor (seek bar, cursor overlay, captions), export. A change that breaks the editor is a failed task even if the bundle is written.
- Lint with `npm run lint` (Biome) before every commit; tests with `npm test` (Vitest).
- MUST: all volatile new state lives in function scope or on disk. MUST NOT: hold recording state in new module-level mutable variables in the main process beyond what OpenScreen already does.
- All new Showhow code goes in `electron/showhow/` (main) and `src/lib/showhow/` (renderer) so fork-vs-upstream diffs stay reviewable.
- Commit messages: `feat(showhow): ...` prefix to keep fork commits distinguishable from upstream.

## Implementation notes

Keep an `implementation-notes.md` in the repo root during the build. If an edge
case or discovery forces a deviation from this plan, pick the conservative option,
log it under a "Deviations" heading (what changed, why, what was done instead),
and keep going. Delete nothing from the file. This file is reviewed alongside the
diff and feeds PLAN-FEEDBACK.md.

---

### Task 1: Fork hygiene + baseline build and run

**Files:**
- No source changes. Repo at `/Users/mohamedb/dev/OS/Projects/web/showhow/desktop` (already cloned from upstream).

**Interfaces:**
- Consumes: nothing.
- Produces: a running baseline every later task builds on, and remotes `origin` (Mohamed's fork) + `upstream` (getopenscreen/openscreen).

- [ ] **Step 1: Create the GitHub fork and set remotes**

```bash
cd /Users/mohamedb/dev/OS/Projects/web/showhow/desktop
git remote rename origin upstream
gh repo fork getopenscreen/openscreen --remote --remote-name origin
git remote -v
```

Expected: `origin` points at `Mocodes/openscreen` (or the account's fork name), `upstream` at `getopenscreen/openscreen`.

- [ ] **Step 2: Create the working branch**

```bash
git checkout -b showhow-phase-1
```

- [ ] **Step 3: Install the pinned toolchain and dependencies**

```bash
node --version   # must print v22.22.1 -- if not: nvm install 22.22.1 && nvm use 22.22.1
npm install
```

Expected: install completes with no `EBADENGINE` error.

- [ ] **Step 4: Build the macOS ScreenCaptureKit helper**

```bash
npm run build:native:mac
```

Expected: exits 0. Requires Xcode Command Line Tools (`xcode-select --install` if it fails on missing swiftc).

- [ ] **Step 5: Run the upstream test suite as a baseline**

Run: `npm test`
Expected: PASS (record the count in implementation-notes.md; any pre-existing failure gets noted there, not fixed).

- [ ] **Step 6: Launch the app and make a baseline recording**

```bash
npm run dev
```

Then: grant Screen Recording + Accessibility permissions when macOS prompts, record ~10s of screen with a few clicks, stop.

DONE WHEN: `ls "$HOME/Library/Application Support/openscreen/recordings/"` shows a fresh `.webm`, a matching `.webm.cursor.json`, and a `.session.json`, and the recording opens in the editor with a working seek bar.

- [ ] **Step 7: Commit the plan file**

```bash
git add docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md
git commit -m "feat(showhow): add phase 1 implementation plan"
```

---

### Task 2: Bundle module (pure logic, TDD)

**Files:**
- Create: `electron/showhow/bundle.ts`
- Test: `electron/showhow/bundle.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (node:fs, node:os, node:path only).
- Produces (used verbatim by Task 3):
  - `SHOWHOW_RECORDINGS_ROOT: string`
  - `bundleDirName(createdAt: number): string`
  - `buildMeta(input: BuildMetaInput): ShowhowMeta`
  - `createRecordingBundle(input: CreateBundleInput): Promise<CreateBundleResult>`
  - types `ShowhowMeta`, `CreateBundleInput`, `CreateBundleResult`

- [ ] **Step 1: Write the failing tests**

```ts
// electron/showhow/bundle.test.ts
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMeta, bundleDirName, createRecordingBundle } from "./bundle";

describe("bundleDirName", () => {
	it("formats createdAt as YYYY-MM-DD_HHMMSS-recording in local time", () => {
		// 2026-07-11 16:42:07 local
		const ts = new Date(2026, 6, 11, 16, 42, 7).getTime();
		expect(bundleDirName(ts)).toBe("2026-07-11_164207-recording");
	});

	it("zero-pads single-digit fields", () => {
		const ts = new Date(2026, 0, 5, 9, 3, 1).getTime();
		expect(bundleDirName(ts)).toBe("2026-01-05_090301-recording");
	});
});

describe("buildMeta", () => {
	it("builds the phase-1 meta contract", () => {
		const createdAt = new Date(2026, 6, 11, 16, 42, 7).getTime();
		const meta = buildMeta({ createdAt, durationMs: 12_500, hasWebcam: false, hasCursorTelemetry: true });
		expect(meta).toEqual({
			schemaVersion: 1,
			title: "Recording 2026-07-11 16:42",
			source: "desktop",
			createdAt,
			durationMs: 12_500,
			video: "video.webm",
			cursorTelemetry: "video.webm.cursor.json",
			transcript: "transcript.txt",
			steps: null,
		});
	});

	it("includes webcam and omits cursorTelemetry when absent", () => {
		const createdAt = new Date(2026, 6, 11, 16, 42, 7).getTime();
		const meta = buildMeta({ createdAt, hasWebcam: true, hasCursorTelemetry: false });
		expect(meta.webcam).toBe("webcam.webm");
		expect(meta.cursorTelemetry).toBeUndefined();
		expect(meta.durationMs).toBeUndefined();
	});
});

describe("createRecordingBundle", () => {
	it("moves artifacts into the bundle folder and writes meta.json", async () => {
		const work = await mkdtemp(path.join(os.tmpdir(), "showhow-bundle-"));
		const root = path.join(work, "Recordings");
		const screenVideoPath = path.join(work, "rec-123.webm");
		await writeFile(screenVideoPath, "fake-webm");
		await writeFile(`${screenVideoPath}.cursor.json`, JSON.stringify({ samples: [] }));

		const createdAt = new Date(2026, 6, 11, 16, 42, 7).getTime();
		const result = await createRecordingBundle({ screenVideoPath, createdAt, durationMs: 9000, recordingsRoot: root });

		const dir = path.join(root, "2026-07-11_164207-recording");
		expect(result.bundleDir).toBe(dir);
		expect(result.screenVideoPath).toBe(path.join(dir, "video.webm"));
		expect((await readFile(result.screenVideoPath, "utf-8"))).toBe("fake-webm");
		// telemetry keeps the <videoPath>.cursor.json convention
		expect((await stat(path.join(dir, "video.webm.cursor.json"))).isFile()).toBe(true);
		expect((await stat(path.join(dir, "screenshots"))).isDirectory()).toBe(true);
		const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf-8"));
		expect(meta.video).toBe("video.webm");
		expect(meta.durationMs).toBe(9000);
		// originals are gone (moved, not copied)
		await expect(stat(screenVideoPath)).rejects.toThrow();
	});

	it("tolerates a missing cursor.json and no webcam", async () => {
		const work = await mkdtemp(path.join(os.tmpdir(), "showhow-bundle-"));
		const root = path.join(work, "Recordings");
		const screenVideoPath = path.join(work, "rec-456.webm");
		await writeFile(screenVideoPath, "fake-webm");

		const result = await createRecordingBundle({ screenVideoPath, createdAt: Date.now(), recordingsRoot: root });

		expect(result.webcamVideoPath).toBeUndefined();
		const meta = JSON.parse(await readFile(path.join(result.bundleDir, "meta.json"), "utf-8"));
		expect(meta.cursorTelemetry).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest --run electron/showhow/bundle.test.ts`
Expected: FAIL -- cannot resolve `./bundle`.

- [ ] **Step 3: Implement `electron/showhow/bundle.ts`**

```ts
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Root for all Showhow recording bundles. One folder per recording; the folder IS the recording. */
export const SHOWHOW_RECORDINGS_ROOT = path.join(os.homedir(), "Showhow", "Recordings");

export interface ShowhowMeta {
	schemaVersion: 1;
	title: string;
	source: "desktop";
	createdAt: number;
	durationMs?: number;
	video: "video.webm";
	webcam?: "webcam.webm";
	/** Kept at the editor's `${videoPath}.cursor.json` convention -- see handlers.ts telemetry loading. */
	cursorTelemetry?: "video.webm.cursor.json";
	transcript: "transcript.txt";
	/** Filled by the Phase 2 doc engine. */
	steps: null;
}

export interface BuildMetaInput {
	createdAt: number;
	durationMs?: number;
	hasWebcam: boolean;
	hasCursorTelemetry: boolean;
}

export interface CreateBundleInput {
	screenVideoPath: string;
	webcamVideoPath?: string;
	createdAt: number;
	durationMs?: number;
	/** Test seam; production callers omit it. */
	recordingsRoot?: string;
}

export interface CreateBundleResult {
	bundleDir: string;
	screenVideoPath: string;
	webcamVideoPath?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function bundleDirName(createdAt: number): string {
	const d = new Date(createdAt);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-recording`;
}

export function buildMeta(input: BuildMetaInput): ShowhowMeta {
	const d = new Date(input.createdAt);
	const title = `Recording ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	return {
		schemaVersion: 1,
		title,
		source: "desktop",
		createdAt: input.createdAt,
		...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
		video: "video.webm",
		...(input.hasWebcam ? { webcam: "webcam.webm" as const } : {}),
		...(input.hasCursorTelemetry ? { cursorTelemetry: "video.webm.cursor.json" as const } : {}),
		transcript: "transcript.txt",
		steps: null,
	};
}

/** Move with cross-device fallback: userData and $HOME are usually one volume, but never assume. */
async function moveFile(src: string, dest: string): Promise<void> {
	try {
		await fs.rename(src, dest);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
		await fs.copyFile(src, dest);
		await fs.rm(src, { force: true });
	}
}

async function fileExists(p: string): Promise<boolean> {
	try {
		await fs.stat(p);
		return true;
	} catch {
		return false;
	}
}

export async function createRecordingBundle(input: CreateBundleInput): Promise<CreateBundleResult> {
	const root = input.recordingsRoot ?? SHOWHOW_RECORDINGS_ROOT;
	const bundleDir = path.join(root, bundleDirName(input.createdAt));
	await fs.mkdir(path.join(bundleDir, "screenshots"), { recursive: true });

	const screenDest = path.join(bundleDir, "video.webm");
	await moveFile(input.screenVideoPath, screenDest);

	const cursorSrc = `${input.screenVideoPath}.cursor.json`;
	const hasCursorTelemetry = await fileExists(cursorSrc);
	if (hasCursorTelemetry) {
		await moveFile(cursorSrc, `${screenDest}.cursor.json`);
	}

	let webcamDest: string | undefined;
	if (input.webcamVideoPath && (await fileExists(input.webcamVideoPath))) {
		webcamDest = path.join(bundleDir, "webcam.webm");
		await moveFile(input.webcamVideoPath, webcamDest);
	}

	const meta = buildMeta({
		createdAt: input.createdAt,
		durationMs: input.durationMs,
		hasWebcam: webcamDest !== undefined,
		hasCursorTelemetry,
	});
	await fs.writeFile(path.join(bundleDir, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");

	return { bundleDir, screenVideoPath: screenDest, ...(webcamDest ? { webcamVideoPath: webcamDest } : {}) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest --run electron/showhow/bundle.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint and commit**

```bash
npm run lint && git add electron/showhow && git commit -m "feat(showhow): recording bundle module (folder contract + meta.json)"
```

---

### Task 3: Wire bundling into `storeRecordedSessionFiles`

**Files:**
- Modify: `electron/ipc/handlers.ts` (function `storeRecordedSessionFiles`, currently at ~line 2254; anchor on code, not line numbers)
- Modify: `electron/preload.ts` + `electron/electron-env.d.ts` only if the store result type is declared there (check; the result is currently untyped passthrough -- if so, no change needed)

**Interfaces:**
- Consumes: `createRecordingBundle` from Task 2.
- Produces: the `store-recorded-session` IPC result gains two fields consumed by Task 4:
  - `bundleDir: string`
  - `videoFileUrl: string` (file:// URL of the bundled `video.webm`)

**MUST:** bundle AFTER `writePendingCursorTelemetry(screenVideoPath)` has run and BEFORE the session manifest is written, then write the manifest with the bundled paths.
**MUST NOT:** write the manifest first and bundle after.
REASON: the `.session.json` manifest is how the app re-opens the recording; stale pre-bundle paths in it mean the editor points at files that no longer exist.

**MUST:** on any bundling error, catch, log, and fall back to the unbundled session (original paths, original manifest).
**MUST NOT:** let a bundling failure reject `store-recorded-session`.
REASON: spec rule "never lose the video because the doc layer failed" -- the recording must save even if Showhow's layer breaks.

- [ ] **Step 1: Add imports at the top of `handlers.ts`**

Alongside the existing imports (near `import { RECORDINGS_DIR } from "../main";`):

```ts
import { createRecordingBundle } from "../showhow/bundle";
```

(`pathToFileURL` is already imported at handlers.ts:7.)

- [ ] **Step 2: Replace the tail of `storeRecordedSessionFiles`**

Find this exact existing block (end of the function):

```ts
		const session: RecordingSession = webcamVideoPath
			? {
					screenVideoPath,
					webcamVideoPath,
					createdAt,
					...(cursorCaptureMode ? { cursorCaptureMode } : {}),
				}
			: { screenVideoPath, createdAt, ...(cursorCaptureMode ? { cursorCaptureMode } : {}) };
		setCurrentRecordingSessionState(session);
		currentProjectPath = null;

		await writePendingCursorTelemetry(screenVideoPath);

		const sessionManifestPath = path.join(
			RECORDINGS_DIR,
			`${path.parse(payload.screen.fileName).name}${RECORDING_SESSION_SUFFIX}`,
		);
		await fs.writeFile(sessionManifestPath, JSON.stringify(session, null, 2), "utf-8");

		return {
			success: true,
			path: screenVideoPath,
			session,
			message: "Recording session stored successfully",
		};
```

Replace with:

```ts
		await writePendingCursorTelemetry(screenVideoPath);

		// Showhow: relocate this recording into its agent-ready bundle folder.
		// Best-effort -- a bundling failure must never lose the recording.
		let bundledScreenPath = screenVideoPath;
		let bundledWebcamPath = webcamVideoPath;
		let bundleDir: string | undefined;
		try {
			const bundle = await createRecordingBundle({
				screenVideoPath,
				webcamVideoPath,
				createdAt,
				durationMs: isValidDurationMs(payload.durationMs) ? payload.durationMs : undefined,
			});
			bundledScreenPath = bundle.screenVideoPath;
			bundledWebcamPath = bundle.webcamVideoPath;
			bundleDir = bundle.bundleDir;
		} catch (error) {
			console.error("Showhow bundle creation failed; keeping flat recording files:", error);
		}

		const session: RecordingSession = bundledWebcamPath
			? {
					screenVideoPath: bundledScreenPath,
					webcamVideoPath: bundledWebcamPath,
					createdAt,
					...(cursorCaptureMode ? { cursorCaptureMode } : {}),
				}
			: {
					screenVideoPath: bundledScreenPath,
					createdAt,
					...(cursorCaptureMode ? { cursorCaptureMode } : {}),
				};
		setCurrentRecordingSessionState(session);
		currentProjectPath = null;

		const sessionManifestPath = path.join(
			RECORDINGS_DIR,
			`${path.parse(payload.screen.fileName).name}${RECORDING_SESSION_SUFFIX}`,
		);
		await fs.writeFile(sessionManifestPath, JSON.stringify(session, null, 2), "utf-8");

		return {
			success: true,
			path: bundledScreenPath,
			session,
			bundleDir,
			videoFileUrl: pathToFileURL(bundledScreenPath).toString(),
			message: "Recording session stored successfully",
		};
```

Note the ordering change from upstream: `setCurrentRecordingSessionState` now runs after telemetry+bundling so it stores final paths. `writePendingCursorTelemetry` moved above the session construction -- it only needs `screenVideoPath`, which is unchanged at that point.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS, same count as Task 1 baseline (no upstream test asserts on the old return shape; if one does, update it and note in implementation-notes.md).

- [ ] **Step 4: Manual end-to-end check**

```bash
npm run dev
```

Record ~10s with clicks and narration, stop, then:

```bash
ls -la ~/Showhow/Recordings/*/
```

DONE WHEN:
- the newest bundle folder contains `video.webm`, `video.webm.cursor.json`, `meta.json`, and an empty `screenshots/` dir
- `video.webm.cursor.json` contains samples with `"interactionType": "click"` entries (you clicked during recording)
- the editor opens the recording after stop with working seek bar AND working cursor overlay (telemetry convention preserved)
- `~/Library/Application Support/openscreen/recordings/` contains no leftover `.webm` for this recording (moved, not copied)

- [ ] **Step 5: Lint and commit**

```bash
npm run lint && git add electron/ipc/handlers.ts && git commit -m "feat(showhow): persist recordings as bundle folders on save"
```

---

### Task 4: Transcript generation after save

**Files:**
- Create: `src/lib/showhow/transcriptFormat.ts`
- Create: `src/lib/showhow/transcriptFormat.test.ts`
- Create: `src/lib/showhow/generateTranscript.ts`
- Modify: `electron/ipc/handlers.ts` (add one IPC handler next to the other `ipcMain.handle` registrations inside the same registration function that owns `store-recorded-session`)
- Modify: `electron/preload.ts` (expose `showhowWriteTranscript`)
- Modify: `electron/electron-env.d.ts` (add to the `electronAPI` interface, near the existing `storeRecordedSession` declaration at ~line 81)
- Modify: `src/hooks/useScreenRecorder.ts` (call site after the successful `storeRecordedSession` at ~line 377)

**Interfaces:**
- Consumes: `bundleDir` + `videoFileUrl` from Task 3's store result; `extractMono16kFromVideoUrl`, `transcribeMono16kToSegments`, `CaptionSegment` from `src/lib/captioning` (already exported from its `index.ts`); `SHOWHOW_RECORDINGS_ROOT` from Task 2.
- Produces: `transcript.txt` in the bundle -- `[m:ss] text` per line; `window.electronAPI.showhowWriteTranscript(bundleDir: string, content: string): Promise<{ success: boolean }>`.

**MUST:** run transcription fire-and-forget (`void generateTranscriptForBundle(...)`) after save succeeds.
**MUST NOT:** `await` it in the save path.
REASON: first run downloads Whisper weights and inference takes tens of seconds on long recordings; blocking save would look like a hang and risks losing the save if the window closes.

**MUST:** in the IPC handler, resolve `bundleDir` and verify it is inside `SHOWHOW_RECORDINGS_ROOT` before writing.
**MUST NOT:** write to any renderer-supplied path unchecked.
REASON: the renderer is the least-trusted process; an unchecked path is an arbitrary-file-write primitive.

- [ ] **Step 1: Write the failing formatter tests**

```ts
// src/lib/showhow/transcriptFormat.test.ts
import { describe, expect, it } from "vitest";
import { formatTimestamp, formatTranscript } from "./transcriptFormat";

describe("formatTimestamp", () => {
	it("formats seconds as m:ss", () => {
		expect(formatTimestamp(0)).toBe("0:00");
		expect(formatTimestamp(4.6)).toBe("0:04");
		expect(formatTimestamp(65)).toBe("1:05");
		expect(formatTimestamp(600)).toBe("10:00");
	});
});

describe("formatTranscript", () => {
	it("renders one [m:ss] line per segment", () => {
		const out = formatTranscript([
			{ startSec: 4.2, endSec: 8.9, text: " So here's where it blows up. " },
			{ startSec: 34.0, endSec: 39.5, text: "The auto-merge drops the title key." },
		]);
		expect(out).toBe(
			"[0:04] So here's where it blows up.\n[0:34] The auto-merge drops the title key.\n",
		);
	});

	it("marks empty transcription explicitly", () => {
		expect(formatTranscript([])).toBe("(no speech detected)\n");
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest --run src/lib/showhow/transcriptFormat.test.ts`
Expected: FAIL -- cannot resolve `./transcriptFormat`.

- [ ] **Step 3: Implement the formatter**

```ts
// src/lib/showhow/transcriptFormat.ts
import type { CaptionSegment } from "@/lib/captioning";

export function formatTimestamp(sec: number): string {
	const total = Math.max(0, Math.floor(sec));
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

/** Renders Whisper segments as the bundle's transcript.txt: one "[m:ss] text" line per segment. */
export function formatTranscript(segments: CaptionSegment[]): string {
	if (segments.length === 0) return "(no speech detected)\n";
	return `${segments.map((seg) => `[${formatTimestamp(seg.startSec)}] ${seg.text.trim()}`).join("\n")}\n`;
}
```

(If the repo's alias for `@/` differs, match the import style used in `src/components/video-editor/VideoEditor.tsx:30`.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest --run src/lib/showhow/transcriptFormat.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the background job**

```ts
// src/lib/showhow/generateTranscript.ts
import { extractMono16kFromVideoUrl, transcribeMono16kToSegments } from "@/lib/captioning";
import { formatTranscript } from "./transcriptFormat";

/**
 * Fire-and-forget after a recording saves: transcribe the bundled video and write
 * transcript.txt into its bundle. Failures degrade to an empty-marker transcript --
 * the bundle must always be complete on disk.
 */
export async function generateTranscriptForBundle(
	bundleDir: string,
	videoFileUrl: string,
): Promise<void> {
	let content = "(transcription failed)\n";
	try {
		const { samples } = await extractMono16kFromVideoUrl(videoFileUrl);
		const { segments } = await transcribeMono16kToSegments(samples);
		content = formatTranscript(segments);
	} catch (error) {
		console.error("Showhow transcript generation failed:", error);
	}
	try {
		await window.electronAPI.showhowWriteTranscript(bundleDir, content);
	} catch (error) {
		console.error("Showhow transcript write failed:", error);
	}
}
```

- [ ] **Step 6: Add the IPC handler in `handlers.ts`**

Next to the other `ipcMain.handle` registrations in the same scope as `store-recorded-session` (so it registers once at startup):

```ts
	ipcMain.handle(
		"showhow:write-transcript",
		async (_, bundleDir: unknown, content: unknown) => {
			if (typeof bundleDir !== "string" || typeof content !== "string") {
				return { success: false };
			}
			const resolved = path.resolve(bundleDir);
			if (!resolved.startsWith(`${SHOWHOW_RECORDINGS_ROOT}${path.sep}`)) {
				console.error("showhow:write-transcript rejected path outside recordings root:", resolved);
				return { success: false };
			}
			try {
				await fs.writeFile(path.join(resolved, "transcript.txt"), content, "utf-8");
				return { success: true };
			} catch (error) {
				console.error("showhow:write-transcript failed:", error);
				return { success: false };
			}
		},
	);
```

And extend the Task 3 import line:

```ts
import { createRecordingBundle, SHOWHOW_RECORDINGS_ROOT } from "../showhow/bundle";
```

- [ ] **Step 7: Expose it in `preload.ts` and type it in `electron-env.d.ts`**

In `electron/preload.ts`, next to the existing `storeRecordedSession` entry (~line 81):

```ts
	showhowWriteTranscript: (bundleDir: string, content: string) =>
		ipcRenderer.invoke("showhow:write-transcript", bundleDir, content),
```

In `electron/electron-env.d.ts`, in the same interface as `storeRecordedSession` (~line 81):

```ts
		showhowWriteTranscript: (bundleDir: string, content: string) => Promise<{ success: boolean }>;
```

Also add `bundleDir?: string` and `videoFileUrl?: string` to the declared `store-recorded-session` result type in `electron-env.d.ts` if one exists (search for where `storeRecordedSession`'s return is typed; mirror the actual Task 3 return).

- [ ] **Step 8: Call it from `useScreenRecorder.ts`**

Directly after the existing success check at ~line 391:

```ts
					if (!result.success) {
						console.error("Failed to store recording session:", result.message);
						return;
					}
```

add:

```ts
					if (result.bundleDir && result.videoFileUrl) {
						// Fire-and-forget: transcript lands in the bundle when Whisper finishes.
						void generateTranscriptForBundle(result.bundleDir, result.videoFileUrl);
					}
```

with the import at the top of the file:

```ts
import { generateTranscriptForBundle } from "@/lib/showhow/generateTranscript";
```

There is a second `storeRecordedSession` call site at ~line 490 in the same file -- apply the same post-success block there.

- [ ] **Step 9: Full suite + manual verification**

Run: `npm test`
Expected: PASS.

Then `npm run dev`, record ~15s while narrating a sentence or two, stop, wait for Whisper (first run downloads weights -- watch devtools console), then:

```bash
cat ~/Showhow/Recordings/*/transcript.txt | tail -5
```

DONE WHEN: the newest bundle's `transcript.txt` contains `[m:ss]`-stamped lines matching what you actually said, and a silent recording produces `(no speech detected)`.

- [ ] **Step 10: Lint and commit**

```bash
npm run lint && git add src/lib/showhow electron/ipc/handlers.ts electron/preload.ts electron/electron-env.d.ts src/hooks/useScreenRecorder.ts && git commit -m "feat(showhow): write transcript.txt into recording bundles after save"
```

---

### Task 5: Fork documentation + phase acceptance

**Files:**
- Create: `SHOWHOW.md` (repo root)
- Create: `implementation-notes.md` (repo root, if the build hasn't already)

**Interfaces:**
- Consumes: everything above.
- Produces: the phase-1 acceptance record and the fork-delta map future phases rely on.

- [ ] **Step 1: Write `SHOWHOW.md`**

```markdown
# Showhow (fork of OpenScreen)

This repo is Showhow Desktop: OpenScreen plus a workflow-doc and agent-handoff
layer. Upstream: https://github.com/getopenscreen/openscreen (MIT).

## Fork deltas (phase 1)

- `electron/showhow/bundle.ts` -- every recording is persisted as a bundle
  folder under `~/Showhow/Recordings/YYYY-MM-DD_HHMMSS-recording/`:
  `video.webm`, `video.webm.cursor.json`, `transcript.txt`, `meta.json`,
  `screenshots/` (empty until the phase-2 doc engine).
- `electron/ipc/handlers.ts` -- `storeRecordedSessionFiles` relocates artifacts
  into the bundle (best-effort; falls back to flat files on error) and returns
  `bundleDir` + `videoFileUrl`; new `showhow:write-transcript` IPC.
- `src/lib/showhow/` -- transcript formatting + fire-and-forget Whisper
  transcription after save (reuses the upstream captioning pipeline).

## Conventions

- All Showhow code lives in `electron/showhow/` and `src/lib/showhow/`.
- Commits are prefixed `feat(showhow):` to keep upstream merges reviewable.
- Never rename `video.webm.cursor.json` -- the editor loads telemetry by the
  `${videoPath}.cursor.json` convention.

## Upstream sync

`git fetch upstream && git merge upstream/main` -- resolve conflicts in
`handlers.ts` by preserving the bundle block at the end of
`storeRecordedSessionFiles`.
```

- [ ] **Step 2: Phase acceptance run**

Full sequence, from clean app start:
1. `npm run dev`
2. Record ~30s of real work (VS Code + a browser window), clicking and narrating.
3. Stop; wait for transcription to finish.

DONE WHEN (all four, verified by looking, not assumed):
- the bundle folder contains all five phase-1 artifacts (`video.webm`, `video.webm.cursor.json`, `transcript.txt`, `meta.json`, `screenshots/`)
- `meta.json` parses, `durationMs` is within ~2s of the real recording length
- the recording still opens and edits normally in the OpenScreen editor
- pasting the bundle path into a Claude Code session with "what happened in this recording?" gets a sensible answer from `transcript.txt` + `video.webm` alone (the phase-2 acceptance will add steps)

- [ ] **Step 3: Commit and push**

```bash
git add SHOWHOW.md implementation-notes.md && git commit -m "docs(showhow): fork deltas and phase-1 acceptance record"
git push -u origin showhow-phase-1
```

---

## Self-review notes

- **Spec coverage:** phase 1 scope = fork runs + folder contract. Tasks 1 (fork/build), 2-3 (folder contract: video, cursor telemetry, meta, screenshots dir), 4 (transcript), 5 (acceptance). `steps.json`/`steps.md` deliberately deferred to phase 2 per spec build order; deviation list covers webm-vs-mp4 and the cursor-json naming.
- **Placeholders:** none; every code step carries the full code. Two "check and mirror" instructions (Task 3 Step re: result typing, Task 4 Step 7 re: env.d.ts result type) are verification instructions against upstream code that may drift, not deferred design.
- **Type consistency:** `createRecordingBundle` / `CreateBundleResult` / `SHOWHOW_RECORDINGS_ROOT` names match across Tasks 2-4; `showhowWriteTranscript` matches preload, env.d.ts, and call site; `bundleDir`/`videoFileUrl` fields match Task 3's return and Task 4's consumption.
