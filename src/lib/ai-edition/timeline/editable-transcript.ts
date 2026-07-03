// Ponytail port of axcut's `lib/editable-transcript.ts` — turn user edits of
// the transcript text into timeline intervals to trim.
//
// Workflow: the right pane renders the transcript text inside a
// contentEditable <p>. When the user edits and commits (blur), the new
// text is sent here. We tokenize it, run LCS against the original word
// list, and figure out which words the user deleted. Deleted words turn
// into source-time intervals the timeline subtracts via `replaceTimeline`.
//
// Mirrors axcut's `deriveEditableTranscriptUpdate(document, editedText)`.

import type { AxcutTranscript } from "../schema";

export interface DeletedWordRange {
	startSec: number;
	endSec: number;
	/** All word IDs in the deleted span — handy for tests + undo. */
	wordIds: string[];
}

/** Axcut's normalization for transcript tokens: lowercase, letters/digits only. */
function normalizeToken(raw: string): string {
	return raw.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Tokenize the user-edited transcript text. Whitespace-separated, with
 * the line-prefix `# Clip N` (Axcut's clip-heading marker) dropped before
 * the tokens land in the LCS. Returns the original text fragments (so we
 * can preserve capitalization in `rejoin` if needed) plus the normalized
 * comparison tokens.
 */
export function tokenizeEditedText(text: string): Array<{ raw: string; token: string }> {
	if (!text) return [];
	const tokens: Array<{ raw: string; token: string }> = [];
	for (const line of text.split(/\r?\n/)) {
		// Skip Axcut's per-clip heading marker so re-formatting the heading
		// doesn't read as a wholesale deletion.
		if (/^#\s*clip\s/i.test(line.trim())) continue;
		for (const piece of line.split(/\s+/)) {
			if (!piece) continue;
			tokens.push({ raw: piece, token: normalizeToken(piece) });
		}
	}
	return tokens;
}

/**
 * Standard LCS table returning a Set of original-index → token matches
 * preserved in the edit. Words in the original list that are NOT in this
 * set were deleted by the user.
 */
function lcsMatchSet(originalTokens: string[], editedTokens: string[]): Set<number> {
	const m = originalTokens.length;
	const n = editedTokens.length;
	if (m === 0 || n === 0) return new Set();

	// DP table of LCS lengths, row-major.
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (originalTokens[i - 1] === editedTokens[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Walk the table back to record which original indices are part of
	// any LCS. Stable: prefer the earliest original match.
	const matched = new Set<number>();
	let i = m;
	let j = n;
	while (i > 0 && j > 0) {
		if (originalTokens[i - 1] === editedTokens[j - 1]) {
			matched.add(i - 1);
			i--;
			j--;
		} else if (dp[i - 1][j] >= dp[i][j - 1]) {
			i--;
		} else {
			j--;
		}
	}
	return matched;
}

/**
 * Group consecutive deleted indices into contiguous source-time spans.
 * A run like [w3, w4, w5, w7] becomes two ranges: [w3..w5] and [w7..w7].
 */
function groupDeletedRuns(
	deletedIndices: number[],
	transcript: AxcutTranscript,
): DeletedWordRange[] {
	if (deletedIndices.length === 0) return [];
	const ranges: DeletedWordRange[] = [];
	let run: number[] = [];

	const flush = () => {
		if (run.length === 0) return;
		const first = transcript.words[run[0]];
		const last = transcript.words[run[run.length - 1]];
		if (!first || !last) {
			run = [];
			return;
		}
		ranges.push({
			startSec: first.startSec,
			endSec: last.endSec,
			wordIds: run.map((i) => transcript.words[i]?.id).filter((id): id is string => Boolean(id)),
		});
		run = [];
	};

	for (const idx of deletedIndices) {
		if (run.length === 0 || idx === run[run.length - 1] + 1) {
			run.push(idx);
		} else {
			flush();
			run.push(idx);
		}
	}
	flush();
	return ranges;
}

/**
 * Top-level entry: given the transcript the user is editing and the
 * new text they committed to, return the contiguous source-time spans
 * of words that were deleted from the text. Empty result → user only
 * added or rearranged text and the timeline stays untouched.
 */
export function deriveEditableTranscriptUpdate(
	transcript: AxcutTranscript,
	editedText: string,
): {
	ranges: DeletedWordRange[];
	deletedWordIds: string[];
} {
	const edited = tokenizeEditedText(editedText);
	const editedTokens = edited.map((t) => t.token);
	const originalTokens = transcript.words.map((w) => normalizeToken(w.text));

	const matched = lcsMatchSet(originalTokens, editedTokens);
	const deletedIndices: number[] = [];
	for (let i = 0; i < originalTokens.length; i++) {
		if (!matched.has(i)) deletedIndices.push(i);
	}

	const ranges = groupDeletedRuns(deletedIndices, transcript);
	return {
		ranges,
		deletedWordIds: deletedIndices
			.map((i) => transcript.words[i]?.id)
			.filter((id): id is string => Boolean(id)),
	};
}

/** Re-render a transcript's words back to plain text (for re-seeding the editor after edits). */
export function transcriptToPlainText(transcript: AxcutTranscript): string {
	return transcript.words.map((w) => w.text).join(" ");
}

/** Re-render only the kept words in a transcript as plain text. */
export function keptWordsToPlainText(transcript: AxcutTranscript, wordRefs?: Set<string>): string {
	const kept = wordRefs ?? new Set(transcript.words.map((w) => w.id));
	return transcript.words
		.filter((w) => kept.has(w.id))
		.map((w) => w.text)
		.join(" ");
}
