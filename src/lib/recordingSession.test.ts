import { describe, expect, it } from "vitest";
import { completeShowhowTranscriptSession, normalizeRecordingSession } from "./recordingSession";

describe("normalizeRecordingSession", () => {
	it("preserves a pending Showhow transcript job across renderer windows", () => {
		const session = normalizeRecordingSession({
			screenVideoPath: "/tmp/video.mp4",
			createdAt: 123,
			showhowBundleDir: "/tmp/bundle",
			showhowVideoFileUrl: "file:///tmp/bundle/video.mp4",
		});

		expect(session).toMatchObject({
			showhowBundleDir: "/tmp/bundle",
			showhowVideoFileUrl: "file:///tmp/bundle/video.mp4",
		});
	});
});

describe("completeShowhowTranscriptSession", () => {
	it("clears the completed job markers without discarding newer session fields", () => {
		const completed = completeShowhowTranscriptSession(
			{
				screenVideoPath: "/tmp/video.mp4",
				webcamVideoPath: "/tmp/webcam.webm",
				createdAt: 123,
				cursorCaptureMode: "system",
				showhowBundleDir: "/tmp/bundle",
				showhowVideoFileUrl: "file:///tmp/bundle/video.mp4",
			},
			"/tmp/bundle",
			"file:///tmp/bundle/video.mp4",
		);

		expect(completed).toEqual({
			screenVideoPath: "/tmp/video.mp4",
			webcamVideoPath: "/tmp/webcam.webm",
			createdAt: 123,
			cursorCaptureMode: "system",
		});
	});

	it("does not alter a session replaced while transcription was running", () => {
		const currentSession = {
			screenVideoPath: "/tmp/new-video.mp4",
			createdAt: 456,
			showhowBundleDir: "/tmp/new-bundle",
			showhowVideoFileUrl: "file:///tmp/new-bundle/video.mp4",
		};

		expect(
			completeShowhowTranscriptSession(
				currentSession,
				"/tmp/bundle",
				"file:///tmp/bundle/video.mp4",
			),
		).toBeNull();
		expect(currentSession.showhowBundleDir).toBe("/tmp/new-bundle");
	});
});
