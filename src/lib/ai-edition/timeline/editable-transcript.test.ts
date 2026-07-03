import { describe, expect, it } from "vitest";
import type { AxcutTranscript } from "../schema";
import {
	deriveEditableTranscriptUpdate,
	keptWordsToPlainText,
	tokenizeEditedText,
	transcriptToPlainText,
} from "./editable-transcript";

function word(id: string, text: string, startSec: number, endSec: number) {
	return {
		id,
		segmentId: "s1",
		startSec,
		endSec,
		text,
	};
}

function makeTranscript(words: Array<ReturnType<typeof word>>): AxcutTranscript {
	return { assetId: "a1", language: "en", segments: [], words };
}

describe("tokenizeEditedText", () => {
	it("splits by whitespace and normalizes", () => {
		const out = tokenizeEditedText("Hello,  WORLD!");
		expect(out).toEqual([
			{ raw: "Hello,", token: "hello" },
			{ raw: "WORLD!", token: "world" },
		]);
	});

	it("drops # Clip N heading lines", () => {
		const out = tokenizeEditedText("# Clip 1\nokay so let's");
		expect(out.map((t) => t.token)).toEqual(["okay", "so", "lets"]);
	});

	it("returns empty for empty input", () => {
		expect(tokenizeEditedText("")).toEqual([]);
		expect(tokenizeEditedText("   \n  ")).toEqual([]);
	});
});

describe("deriveEditableTranscriptUpdate", () => {
	it("returns no deletions when the edited text matches the original", () => {
		const t = makeTranscript([
			word("w1", "okay", 0, 0.5),
			word("w2", "so", 0.5, 0.8),
			word("w3", "let's", 0.8, 1.2),
		]);
		const result = deriveEditableTranscriptUpdate(t, "okay so let's");
		expect(result.deletedWordIds).toEqual([]);
		expect(result.ranges).toEqual([]);
	});

	it("marks a middle word as deleted when it is removed from the text", () => {
		const t = makeTranscript([
			word("w1", "okay", 0, 0.5),
			word("w2", "so", 0.5, 0.8),
			word("w3", "let's", 0.8, 1.2),
			word("w4", "go", 1.2, 1.5),
		]);
		const result = deriveEditableTranscriptUpdate(t, "okay let's go");
		expect(result.deletedWordIds).toEqual(["w2"]);
		expect(result.ranges).toHaveLength(1);
		expect(result.ranges[0]).toMatchObject({
			startSec: 0.5,
			endSec: 0.8,
			wordIds: ["w2"],
		});
	});

	it("groups consecutive deletions into a single source-time span", () => {
		const t = makeTranscript([
			word("w1", "okay", 0, 0.5),
			word("w2", "so", 0.5, 0.8),
			word("w3", "let's", 0.8, 1.2),
			word("w4", "go", 1.2, 1.5),
			word("w5", "now", 1.5, 1.8),
		]);
		const result = deriveEditableTranscriptUpdate(t, "okay now");
		expect(result.deletedWordIds).toEqual(["w2", "w3", "w4"]);
		expect(result.ranges).toHaveLength(1);
		expect(result.ranges[0]).toMatchObject({
			startSec: 0.5,
			endSec: 1.5,
			wordIds: ["w2", "w3", "w4"],
		});
	});

	it("splits separated deletions into multiple ranges", () => {
		const t = makeTranscript([
			word("w1", "a", 0, 0.2),
			word("w2", "b", 0.2, 0.4),
			word("w3", "c", 0.4, 0.6),
			word("w4", "d", 0.6, 0.8),
			word("w5", "e", 0.8, 1.0),
		]);
		// Removed b and d — non-consecutive.
		const result = deriveEditableTranscriptUpdate(t, "a c e");
		expect(result.deletedWordIds).toEqual(["w2", "w4"]);
		expect(result.ranges).toHaveLength(2);
		expect(result.ranges[0]).toMatchObject({ wordIds: ["w2"] });
		expect(result.ranges[1]).toMatchObject({ wordIds: ["w4"] });
	});

	it("normalizes tokens so case + punctuation do not cause false deletions", () => {
		const t = makeTranscript([word("w1", "Hello", 0, 0.5), word("w2", "World", 0.5, 1.0)]);
		const result = deriveEditableTranscriptUpdate(t, "hello, world!");
		expect(result.deletedWordIds).toEqual([]);
	});

	it("ignores added words (only reports deletions from the original)", () => {
		const t = makeTranscript([word("w1", "okay", 0, 0.5)]);
		const result = deriveEditableTranscriptUpdate(t, "okay brand new words here");
		expect(result.deletedWordIds).toEqual([]);
	});
});

describe("transcriptToPlainText / keptWordsToPlainText", () => {
	const t = makeTranscript([
		word("w1", "okay", 0, 0.5),
		word("w2", "so", 0.5, 0.8),
		word("w3", "let's", 0.8, 1.2),
	]);

	it("renders all words joined by spaces", () => {
		expect(transcriptToPlainText(t)).toBe("okay so let's");
	});

	it("filters by kept set when provided", () => {
		expect(keptWordsToPlainText(t, new Set(["w1", "w3"]))).toBe("okay let's");
	});
});
