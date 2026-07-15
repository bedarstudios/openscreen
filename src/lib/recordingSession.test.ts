import { describe, expect, it } from "vitest";
import { normalizeRecordingSession } from "./recordingSession";

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
