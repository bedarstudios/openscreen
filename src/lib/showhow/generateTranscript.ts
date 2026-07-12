import { extractMono16kFromVideoUrl, transcribeMono16kToSegments } from "@/lib/captioning";
import { formatTranscript } from "./transcriptFormat";

/**
 * Fire-and-forget after a recording saves: transcribe the bundled video and write
 * transcript.txt into its bundle. Failures degrade to an empty-marker transcript --
 * the bundle must always be complete on disk.
 */
export async function generateTranscriptForBundle(
	bundleDir: string,
	videoFileUrl: string,
): Promise<void> {
	let content = "(transcription failed)\n";
	try {
		const { samples } = await extractMono16kFromVideoUrl(videoFileUrl);
		const { segments } = await transcribeMono16kToSegments(samples);
		content = formatTranscript(segments);
	} catch (error) {
		console.error("Showhow transcript generation failed:", error);
	}
	try {
		await window.electronAPI.showhowWriteTranscript(bundleDir, content);
	} catch (error) {
		console.error("Showhow transcript write failed:", error);
	}
}
