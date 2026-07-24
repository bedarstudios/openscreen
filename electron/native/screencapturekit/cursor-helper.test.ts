import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const helperPath = path.join(
	process.cwd(),
	"electron/native/screencapturekit/Sources/ShowhowMacOSCursorHelper/main.swift",
);

describe("macOS cursor helper click hook", () => {
	it("taps the HID event stream so coordinate-posted clicks are captured", async () => {
		const source = await readFile(helperPath, "utf-8");

		expect(source).toContain("tap: .cghidEventTap");
	});
});
