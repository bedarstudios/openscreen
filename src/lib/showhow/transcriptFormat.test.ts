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
