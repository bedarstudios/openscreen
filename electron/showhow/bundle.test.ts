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
