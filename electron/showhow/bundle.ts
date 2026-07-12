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

	return {
		bundleDir,
		screenVideoPath: screenDest,
		...(webcamDest ? { webcamVideoPath: webcamDest } : {}),
	};
}
