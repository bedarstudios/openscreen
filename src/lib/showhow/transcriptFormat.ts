import type { CaptionSegment } from "@/lib/captioning";

export function formatTimestamp(sec: number): string {
	const total = Math.max(0, Math.floor(sec));
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

/** Renders Whisper segments as the bundle's transcript.txt: one "[m:ss] text" line per segment. */
export function formatTranscript(segments: CaptionSegment[]): string {
	if (segments.length === 0) return "(no speech detected)\n";
	return `${segments.map((seg) => `[${formatTimestamp(seg.startSec)}] ${seg.text.trim()}`).join("\n")}\n`;
}
