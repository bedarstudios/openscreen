import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

/** Root for all Showhow recording bundles. One folder per recording; the folder IS the recording. */
export const SHOWHOW_RECORDINGS_ROOT = path.join(os.homedir(), "Showhow", "Recordings");

export interface ShowhowMeta {
	schemaVersion: 1;
	title: string;
	source: "desktop";
	createdAt: number;
	durationMs?: number;
	video: "video.webm" | "video.mp4";
	webcam?: "webcam.webm";
	/** Kept at the editor's `${videoPath}.cursor.json` convention -- see handlers.ts telemetry loading. */
	cursorTelemetry?: "video.webm.cursor.json" | "video.mp4.cursor.json";
	transcript: "transcript.txt";
	/** Filled by the Phase 2 doc engine. */
	steps: null;
	stepCapture?: {
		status: "available" | "unavailable";
		message?: string;
	};
}

export interface BuildMetaInput {
	createdAt: number;
	durationMs?: number;
	hasWebcam: boolean;
	hasCursorTelemetry: boolean;
	videoFileName?: "video.webm" | "video.mp4";
}

export interface CreateBundleInput {
	screenVideoPath: string;
	webcamVideoPath?: string;
	createdAt: number;
	durationMs?: number;
	/** Test seam; production callers omit it. */
	recordingsRoot?: string;
	/** Test seam; production callers omit it. */
	extractFrames?: FrameExtractor;
}

export interface CreateBundleResult {
	bundleDir: string;
	screenVideoPath: string;
	webcamVideoPath?: string;
}

interface ClickSample {
	timeMs: number;
	cx: number;
	cy: number;
	interactionType?: string;
}

export interface StepFrame {
	timeMs: number;
	cx: number;
	cy: number;
	outputPath: string;
}

export interface FrameExtractorInput {
	videoPath: string;
	screenshotsDir: string;
	clicks: StepFrame[];
}

export type FrameExtractor = (input: FrameExtractorInput) => Promise<void>;

const pad = (n: number) => String(n).padStart(2, "0");

export function bundleDirName(createdAt: number): string {
	const d = new Date(createdAt);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-recording`;
}

export function buildMeta(input: BuildMetaInput): ShowhowMeta {
	const d = new Date(input.createdAt);
	const title = `Recording ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	const videoFileName = input.videoFileName ?? "video.webm";
	return {
		schemaVersion: 1,
		title,
		source: "desktop",
		createdAt: input.createdAt,
		...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
		video: videoFileName,
		...(input.hasWebcam ? { webcam: "webcam.webm" as const } : {}),
		...(input.hasCursorTelemetry
			? { cursorTelemetry: `${videoFileName}.cursor.json` as ShowhowMeta["cursorTelemetry"] }
			: {}),
		transcript: "transcript.txt",
		steps: null,
	};
}

function clickSamplesFromTelemetry(raw: string): ClickSample[] {
	try {
		const telemetry = JSON.parse(raw) as { samples?: unknown };
		if (!Array.isArray(telemetry.samples)) return [];
		return telemetry.samples.filter(
			(sample): sample is ClickSample =>
				typeof sample === "object" &&
				sample !== null &&
				(sample as ClickSample).interactionType === "click" &&
				typeof (sample as ClickSample).timeMs === "number" &&
				typeof (sample as ClickSample).cx === "number" &&
				typeof (sample as ClickSample).cy === "number",
		);
	} catch {
		return [];
	}
}

function markerFilter(cx: number, cy: number): string {
	const x = Math.min(1, Math.max(0, cx)).toFixed(6);
	const y = Math.min(1, Math.max(0, cy)).toFixed(6);
	return `drawbox=x=iw*${x}-16:y=ih*${y}-16:w=32:h=32:color=red@0.9:t=fill,drawbox=x=iw*${x}-20:y=ih*${y}-20:w=40:h=40:color=white@0.9:t=4`;
}

export const extractDesktopStepFrames: FrameExtractor = async ({
	videoPath,
	screenshotsDir,
	clicks,
}) => {
	for (const click of clicks) {
		await execFile("ffmpeg", [
			"-y",
			"-ss",
			String(click.timeMs / 1000),
			"-i",
			videoPath,
			"-frames:v",
			"1",
			"-vf",
			markerFilter(click.cx, click.cy),
			path.join(screenshotsDir, click.outputPath),
		]);
	}
};

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

	const videoFileName =
		path.extname(input.screenVideoPath).toLowerCase() === ".mp4" ? "video.mp4" : "video.webm";
	const screenDest = path.join(bundleDir, videoFileName);
	await moveFile(input.screenVideoPath, screenDest);

	const cursorSrc = `${input.screenVideoPath}.cursor.json`;
	const hasCursorTelemetry = await fileExists(cursorSrc);
	if (hasCursorTelemetry) {
		await moveFile(cursorSrc, `${screenDest}.cursor.json`);
	}

	const screenshotsDir = path.join(bundleDir, "screenshots");
	const clicks = hasCursorTelemetry
		? clickSamplesFromTelemetry(await fs.readFile(`${screenDest}.cursor.json`, "utf-8"))
		: [];
	const stepFrames = clicks.map((click, index) => ({
		timeMs: click.timeMs,
		cx: click.cx,
		cy: click.cy,
		outputPath: `step-${String(index + 1).padStart(2, "0")}.png`,
	}));
	let stepCapture: ShowhowMeta["stepCapture"];
	if (stepFrames.length === 0) {
		stepCapture = {
			status: "unavailable",
			message: "No desktop clicks were captured; this bundle has a transcript-only doc.",
		};
	} else {
		try {
			await (input.extractFrames ?? extractDesktopStepFrames)({
				videoPath: screenDest,
				screenshotsDir,
				clicks: stepFrames,
			});
			stepCapture = { status: "available" };
		} catch (error) {
			console.warn("[showhow] desktop click frame extraction unavailable:", error);
			stepCapture = {
				status: "unavailable",
				message:
					"Desktop click frames could not be extracted; this bundle has a transcript-only doc.",
			};
		}
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
		videoFileName,
	});
	if (stepCapture) {
		meta.stepCapture = stepCapture;
	}
	await fs.writeFile(path.join(bundleDir, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");

	return {
		bundleDir,
		screenVideoPath: screenDest,
		...(webcamDest ? { webcamVideoPath: webcamDest } : {}),
	};
}
