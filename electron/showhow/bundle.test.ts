import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMeta, bundleDirName, createRecordingBundle, type FrameExtractor } from "./bundle";

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
		const meta = buildMeta({
			createdAt,
			durationMs: 12_500,
			hasWebcam: false,
			hasCursorTelemetry: true,
		});
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
	it("extracts a marked step frame for every click in cursor telemetry", async () => {
		const work = await mkdtemp(path.join(os.tmpdir(), "showhow-bundle-"));
		const screenVideoPath = path.join(work, "rec-clicks.mp4");
		await writeFile(screenVideoPath, "fake-mp4");
		await writeFile(
			`${screenVideoPath}.cursor.json`,
			JSON.stringify({
				samples: [
					{ timeMs: 1_250, cx: 0.25, cy: 0.5, interactionType: "click" },
					{ timeMs: 2_000, cx: 0.5, cy: 0.5, interactionType: "move" },
					{ timeMs: 3_500, cx: 0.75, cy: 0.2, interactionType: "click" },
				],
			}),
		);
		const frames: Parameters<FrameExtractor>[0][] = [];
		const extractFrames: FrameExtractor = async (input) => {
			frames.push(input);
		};

		const result = await createRecordingBundle({
			screenVideoPath,
			createdAt: Date.now(),
			recordingsRoot: path.join(work, "Recordings"),
			extractFrames,
		});

		expect(frames).toEqual([
			{
				videoPath: result.screenVideoPath,
				screenshotsDir: path.join(result.bundleDir, "screenshots"),
				clicks: [
					{ timeMs: 1_250, cx: 0.25, cy: 0.5, outputPath: "step-01.png" },
					{ timeMs: 3_500, cx: 0.75, cy: 0.2, outputPath: "step-02.png" },
				],
			},
		]);
	});

	it("keeps the video and records transcript-only degradation when frame extraction fails", async () => {
		const work = await mkdtemp(path.join(os.tmpdir(), "showhow-bundle-"));
		const screenVideoPath = path.join(work, "rec-click.mp4");
		await writeFile(screenVideoPath, "fake-mp4");
		await writeFile(
			`${screenVideoPath}.cursor.json`,
			JSON.stringify({
				samples: [{ timeMs: 100, cx: 0.5, cy: 0.5, interactionType: "click" }],
			}),
		);

		const result = await createRecordingBundle({
			screenVideoPath,
			createdAt: Date.now(),
			recordingsRoot: path.join(work, "Recordings"),
			extractFrames: async () => {
				throw new Error("ffmpeg is unavailable");
			},
		});

		expect(await readFile(result.screenVideoPath, "utf-8")).toBe("fake-mp4");
		const meta = JSON.parse(await readFile(path.join(result.bundleDir, "meta.json"), "utf-8"));
		expect(meta.stepCapture).toEqual({
			status: "unavailable",
			message:
				"Desktop click frames could not be extracted; this bundle has a transcript-only doc.",
		});
	});

	it("moves artifacts into the bundle folder and writes meta.json", async () => {
		const work = await mkdtemp(path.join(os.tmpdir(), "showhow-bundle-"));
		const root = path.join(work, "Recordings");
		const screenVideoPath = path.join(work, "rec-123.webm");
		await writeFile(screenVideoPath, "fake-webm");
		await writeFile(`${screenVideoPath}.cursor.json`, JSON.stringify({ samples: [] }));

		const createdAt = new Date(2026, 6, 11, 16, 42, 7).getTime();
		const result = await createRecordingBundle({
			screenVideoPath,
			createdAt,
			durationMs: 9000,
			recordingsRoot: root,
		});

		const dir = path.join(root, "2026-07-11_164207-recording");
		expect(result.bundleDir).toBe(dir);
		expect(result.screenVideoPath).toBe(path.join(dir, "video.webm"));
		expect(await readFile(result.screenVideoPath, "utf-8")).toBe("fake-webm");
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

		const result = await createRecordingBundle({
			screenVideoPath,
			createdAt: Date.now(),
			recordingsRoot: root,
		});

		expect(result.webcamVideoPath).toBeUndefined();
		const meta = JSON.parse(await readFile(path.join(result.bundleDir, "meta.json"), "utf-8"));
		expect(meta.cursorTelemetry).toBeUndefined();
	});

	it("preserves an MP4 screen recording's container extension", async () => {
		const work = await mkdtemp(path.join(os.tmpdir(), "showhow-bundle-"));
		const root = path.join(work, "Recordings");
		const screenVideoPath = path.join(work, "native-recording.mp4");
		await writeFile(screenVideoPath, "fake-mp4");

		const result = await createRecordingBundle({
			screenVideoPath,
			createdAt: Date.now(),
			recordingsRoot: root,
		});

		expect(path.basename(result.screenVideoPath)).toBe("video.mp4");
		const meta = JSON.parse(await readFile(path.join(result.bundleDir, "meta.json"), "utf-8"));
		expect(meta.video).toBe("video.mp4");
	});
});
