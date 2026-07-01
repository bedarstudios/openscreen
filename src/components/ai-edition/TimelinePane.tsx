import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
	type DragEvent as ReactDragEvent,
	type PointerEvent as ReactPointerEvent,
	type WheelEvent as ReactWheelEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { AxcutClip } from "@/lib/ai-edition/schema";
import { startGlobalPointerDrag } from "@/lib/ai-edition/timeline/pointer-drag";
import { formatSeconds } from "@/lib/ai-edition/timeline/virtual-preview";
import styles from "./TimelinePane.module.css";

// pxPerSec limits — at zoom=1 the timeline fits the viewport (pxPerSec =
// fitPxPerSec); MAX_PX_PER_SEC caps how dense the clips can get when zoomed
// in. Mirrors axcut TimelinePane.tsx MAX_PX_PER_SEC.
const MAX_PX_PER_SEC = 280;
const MIN_SOURCE_DURATION_SEC = 0.001;
const TIMELINE_START_GUTTER_PX = 6;
const TIMELINE_END_GUTTER_PX = 6;
const SKIP_CONTROLS_HIDE_DELAY_MS = 220;

// ResizeState: live state of a single in-flight skip-edge resize. Refs are
// used as a hot-path mirror so move handlers read fresh values without
// re-creating callbacks every render.
type ResizeState = {
	id: number;
	itemId: string;
	edge: "start" | "end";
	startClientX: number;
	startSec: number;
	endSec: number;
	currentStartSec: number;
	currentEndSec: number;
	minStartSec: number;
	maxEndSec: number;
};

const ASSET_MIME = "application/x-axcut-asset";
const CLIP_MIME = "application/x-axcut-clip-index";

interface AssetMeta {
	id: string;
	label: string;
	durationSec?: number;
}

interface SkipRange {
	id: string;
	assetId: string;
	startSec: number;
	endSec: number;
}

interface TimelinePaneProps {
	clips: AxcutClip[];
	assets: AssetMeta[];
	skipRanges: SkipRange[];
	currentTimeSec: number;
	selectedClipId: string | null;
	onSelectClip: (id: string) => void;
	onSeek: (timelineSec: number) => void;
	onInsertAsset: (assetId: string, index: number) => void;
	onMoveClip: (clipId: string, toIndex: number) => void;
	onEditClip: (clip: AxcutClip) => void;
	onRemoveClip: (clipId: string) => void;
	onUpdateSkipRange: (skipId: string, startSec: number, endSec: number) => void;
	onRemoveSkipRange: (skipId: string) => void;
}

type KeepSegment = { kind: "keep"; len: number };
type CutSegment = {
	kind: "cut";
	len: number;
	skipId: string;
	startSec: number;
	endSec: number;
	minStartSec: number;
	maxEndSec: number;
};
type Segment = KeepSegment | CutSegment;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

// Split a clip's source span into keep/cut segments using the asset's skip
// ranges. Cut segments carry the skip id + local drag bounds (clamped to the
// clip's own source span and the neighboring skip) so they can be resized or
// deleted in place — mirrors Axcut's per-clip skip strips.
function clipSegments(clip: AxcutClip, skips: SkipRange[]): Segment[] {
	const s0 = clip.sourceStartSec;
	const s1 = clip.sourceEndSec ?? s0;
	const span = Math.max(0.001, s1 - s0);
	const cuts = skips
		.filter((k) => k.assetId === clip.assetId && k.endSec > s0 && k.startSec < s1)
		.map((k) => ({ skipId: k.id, start: Math.max(s0, k.startSec), end: Math.min(s1, k.endSec) }))
		.sort((a, b) => a.start - b.start);
	const segs: Segment[] = [];
	let cur = s0;
	cuts.forEach((c, i) => {
		if (c.start > cur) segs.push({ kind: "keep", len: c.start - cur });
		segs.push({
			kind: "cut",
			len: c.end - c.start,
			skipId: c.skipId,
			startSec: c.start,
			endSec: c.end,
			minStartSec: i > 0 ? cuts[i - 1].end : s0,
			maxEndSec: i < cuts.length - 1 ? cuts[i + 1].start : s1,
		});
		cur = Math.max(cur, c.end);
	});
	if (cur < s1) segs.push({ kind: "keep", len: s1 - cur });
	if (segs.length === 0) segs.push({ kind: "keep", len: span });
	return segs;
}

// Adaptive ruler: major step is the smallest entry in the standard
// [0.1..600s] ladder whose px-size ≥ 90. Minor ticks fall at major/4. As
// you zoom in the step shrinks; zoom out, it grows. Source:
// axcut TimelinePane.tsx chooseTickStep / buildRulerTicks.
function chooseTickStep(minStepSec: number): number {
	const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
	return steps.find((step) => step >= minStepSec) ?? steps.at(-1)!;
}

interface RulerTick {
	timeSec: number;
	major: boolean;
}

function buildRulerTicks(durationSec: number, pxPerSec: number): RulerTick[] {
	const majorStepSec = chooseTickStep(90 / Math.max(pxPerSec, 0.001));
	const minorStepSec = majorStepSec / 4;
	const ticks: RulerTick[] = [];
	for (let t = 0; t <= durationSec + minorStepSec / 2; t += minorStepSec) {
		const rounded = Number(t.toFixed(4));
		const major = Math.abs(rounded / majorStepSec - Math.round(rounded / majorStepSec)) < 0.001;
		ticks.push({ timeSec: Math.min(durationSec, rounded), major });
	}
	return ticks;
}

export function TimelinePane({
	clips,
	assets,
	skipRanges,
	currentTimeSec,
	selectedClipId,
	onSelectClip,
	onSeek,
	onInsertAsset,
	onMoveClip,
	onEditClip,
	onRemoveClip,
	onUpdateSkipRange,
	onRemoveSkipRange,
}: TimelinePaneProps) {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const resizeRef = useRef<ResizeState | null>(null);
	const [viewportWidthPx, setViewportWidthPx] = useState(0);
	const [zoom, setZoom] = useState(1);
	const [visibleStartSec, setVisibleStartSec] = useState(0);
	const [hoveredCutId, setHoveredCutId] = useState<string | null>(null);
	const [dragPreview, setDragPreview] = useState<{
		skipId: string;
		startSec: number;
		endSec: number;
	} | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);
	const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const resizeSequenceRef = useRef(0);

	const sourceDuration = useMemo(
		() =>
			Math.max(
				MIN_SOURCE_DURATION_SEC,
				clips.reduce((m, c) => Math.max(m, c.timelineEndSec), 0),
			),
		[clips],
	);
	const usableWidthPx = Math.max(
		1,
		viewportWidthPx - TIMELINE_START_GUTTER_PX - TIMELINE_END_GUTTER_PX,
	);
	const fitPxPerSec = usableWidthPx / Math.max(sourceDuration, MIN_SOURCE_DURATION_SEC);
	const pxPerSec = clamp(fitPxPerSec * zoom, fitPxPerSec, MAX_PX_PER_SEC);
	const contentWidthPx = Math.max(
		viewportWidthPx,
		sourceDuration * pxPerSec + TIMELINE_START_GUTTER_PX + TIMELINE_END_GUTTER_PX,
	);
	const visibleDurationSec = clamp(usableWidthPx / Math.max(pxPerSec, 0.001), 0, sourceDuration);
	const canvasOffsetPx = visibleStartSec * pxPerSec;
	const ticks = useMemo(
		() => buildRulerTicks(sourceDuration, pxPerSec),
		[sourceDuration, pxPerSec],
	);

	const orderedClips = useMemo(
		() => [...clips].sort((a, b) => a.timelineStartSec - b.timelineStartSec),
		[clips],
	);
	const assetLabel = useCallback(
		(assetId: string) => assets.find((a) => a.id === assetId)?.label ?? "Untitled source",
		[assets],
	);

	// ResizeObserver on the viewport + window resize listener. Source:
	// axcut TimelinePane.tsx updateMetrics.
	useEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		const updateMetrics = () => {
			setViewportWidthPx(el.clientWidth);
		};
		updateMetrics();
		const observer = new ResizeObserver(updateMetrics);
		observer.observe(el);
		window.addEventListener("resize", updateMetrics);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", updateMetrics);
		};
	}, []);

	// Clamp visibleStartSec into the legal range whenever sourceDuration or
	// pxPerSec changes (e.g. clips arrive or the viewport resizes).
	useEffect(() => {
		const maxVisibleStartSec = Math.max(0, sourceDuration - visibleDurationSec);
		setVisibleStartSec((current) => clamp(current, 0, maxVisibleStartSec));
	}, [sourceDuration, visibleDurationSec]);

	useEffect(
		() => () => {
			if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
		},
		[],
	);

	const showCutControls = useCallback((cutId: string) => {
		if (hideControlsTimerRef.current) {
			clearTimeout(hideControlsTimerRef.current);
			hideControlsTimerRef.current = null;
		}
		setHoveredCutId(cutId);
	}, []);

	const scheduleHideCutControls = useCallback((cutId: string) => {
		if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
		hideControlsTimerRef.current = setTimeout(() => {
			setHoveredCutId((current) => (current === cutId ? null : current));
			hideControlsTimerRef.current = null;
		}, SKIP_CONTROLS_HIDE_DELAY_MS);
	}, []);

	// Convert a screen-x (PointerEvent.clientX) to a source-time on the
	// timeline, accounting for the canvas's translateX pan offset.
	const sourceSecFromClientX = useCallback(
		(clientX: number): number => {
			const viewport = viewportRef.current;
			if (!viewport) return 0;
			const rect = viewport.getBoundingClientRect();
			const canvasX = clientX - rect.left + canvasOffsetPx;
			return clamp(
				(canvasX - TIMELINE_START_GUTTER_PX) / Math.max(pxPerSec, 0.001),
				0,
				sourceDuration,
			);
		},
		[canvasOffsetPx, pxPerSec, sourceDuration],
	);

	// Compute the clip index a drop at clientX should land at, by comparing
	// the cursor's source-time against each clip's horizontal midpoint.
	const indexFromClientX = useCallback(
		(clientX: number): number => {
			const timelineSec = sourceSecFromClientX(clientX);
			for (let i = 0; i < orderedClips.length; i += 1) {
				const c = orderedClips[i];
				const midpointSec = (c.timelineStartSec + c.timelineEndSec) / 2;
				if (timelineSec < midpointSec) return i;
			}
			return orderedClips.length;
		},
		[orderedClips, sourceSecFromClientX],
	);

	// Drop marker px position: boundary between dropIndex-th and
	// (dropIndex+1)-th clip. Edge cases: before all → 0, after all →
	// virtualDurationSec.
	const dropMarkerLeftPx = useMemo(() => {
		if (dropIndex === null) return null;
		const boundarySec =
			dropIndex <= 0
				? 0
				: dropIndex >= orderedClips.length
					? (orderedClips[orderedClips.length - 1]?.timelineEndSec ?? 0)
					: (orderedClips[dropIndex]?.timelineStartSec ?? 0);
		return TIMELINE_START_GUTTER_PX + boundarySec * pxPerSec;
	}, [dropIndex, orderedClips, pxPerSec]);

	const handleDragOver = useCallback(
		(e: ReactDragEvent<HTMLDivElement>) => {
			const dt = e.dataTransfer;
			const isAsset = dt.types.includes(ASSET_MIME);
			const isClip = dt.types.includes(CLIP_MIME);
			if (!isAsset && !isClip) return;
			e.preventDefault();
			dt.dropEffect = isClip ? "move" : "copy";
			setDropIndex(indexFromClientX(e.clientX));
		},
		[indexFromClientX],
	);

	const handleDrop = useCallback(
		(e: ReactDragEvent<HTMLDivElement>) => {
			const index = indexFromClientX(e.clientX);
			const assetId = e.dataTransfer.getData(ASSET_MIME);
			const clipIdxRaw = e.dataTransfer.getData(CLIP_MIME);
			setDropIndex(null);
			if (assetId) {
				e.preventDefault();
				onInsertAsset(assetId, index);
				return;
			}
			if (clipIdxRaw !== "") {
				e.preventDefault();
				const from = Number(clipIdxRaw);
				const clip = orderedClips[from];
				if (!clip) return;
				const to = index > from ? index - 1 : index;
				if (to !== from) onMoveClip(clip.id, to);
			}
		},
		[indexFromClientX, onInsertAsset, onMoveClip, orderedClips],
	);

	// Click+drag on the viewport → scrub. Uses startGlobalPointerDrag so
	// the drag survives the pointer leaving the viewport.
	const startScrub = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			const target = event.target as Element | null;
			if (target?.closest("button, [data-clip-idx]")) return;
			if (event.button !== 0 || orderedClips.length === 0) return;
			event.preventDefault();
			onSeek(sourceSecFromClientX(event.clientX));
			startGlobalPointerDrag(event, {
				onMove: (moveEvent) => onSeek(sourceSecFromClientX(moveEvent.clientX)),
				onEnd: () => undefined,
			});
		},
		[onSeek, orderedClips.length, sourceSecFromClientX],
	);

	// Drag a skip's start/end chevron. Reuses startGlobalPointerDrag so the
	// drag survives pointer-leaves. The chevrons live on `.segment.cut`
	// hover-revealed controls inside each clip's track-visual.
	const startResizeSkip = useCallback(
		(
			clipId: string,
			seg: CutSegment,
			edge: "start" | "end",
			event: ReactPointerEvent<HTMLElement>,
		) => {
			event.preventDefault();
			event.stopPropagation();
			const clip = orderedClips.find((c) => c.id === clipId);
			if (!clip) return;
			const id = resizeSequenceRef.current + 1;
			resizeSequenceRef.current = id;
			const initial: ResizeState = {
				id,
				itemId: seg.skipId,
				edge,
				startClientX: event.clientX,
				startSec: seg.startSec,
				endSec: seg.endSec,
				currentStartSec: seg.startSec,
				currentEndSec: seg.endSec,
				minStartSec: seg.minStartSec,
				maxEndSec: seg.maxEndSec,
			};
			resizeRef.current = initial;
			setDragPreview({ skipId: seg.skipId, startSec: seg.startSec, endSec: seg.endSec });

			startGlobalPointerDrag(event, {
				onMove: (moveEvent) => {
					const current = resizeRef.current;
					if (!current || current.id !== id) return;
					const deltaSec = (moveEvent.clientX - current.startClientX) / Math.max(pxPerSec, 0.001);
					const nextStartSec =
						current.edge === "start"
							? clamp(
									current.startSec + deltaSec,
									current.minStartSec,
									current.currentEndSec - 0.05,
								)
							: current.currentStartSec;
					const nextEndSec =
						current.edge === "end"
							? clamp(current.endSec + deltaSec, nextStartSec + 0.05, current.maxEndSec)
							: current.currentEndSec;
					const next = { ...current, currentStartSec: nextStartSec, currentEndSec: nextEndSec };
					resizeRef.current = next;
					setDragPreview({ skipId: seg.skipId, startSec: nextStartSec, endSec: nextEndSec });
				},
				onEnd: () => {
					const current = resizeRef.current;
					if (!current || current.id !== id) {
						resizeRef.current = null;
						setDragPreview(null);
						return;
					}
					const changed =
						Math.abs(current.currentStartSec - current.startSec) > 0.001 ||
						Math.abs(current.currentEndSec - current.endSec) > 0.001;
					resizeRef.current = null;
					if (changed) {
						onUpdateSkipRange(seg.skipId, current.currentStartSec, current.currentEndSec);
					}
					requestAnimationFrame(() => {
						setDragPreview(null);
					});
				},
			});
		},
		[orderedClips, onUpdateSkipRange, pxPerSec],
	);

	const handleWheel = useCallback(
		(event: ReactWheelEvent<HTMLDivElement>) => {
			// T06 — Ctrl/Cmd+wheel zooms around the cursor. Plain wheel is
			// intentionally ignored for now; the navigator strip (T11) will
			// own pan gestures via Alt+drag.
			if (!(event.ctrlKey || event.metaKey)) return;
			event.preventDefault();
			const direction = event.deltaY > 0 ? -1 : 1;
			const factor = direction > 0 ? 1.18 : 1 / 1.18;
			setZoom((z) => {
				const maxZoom = MAX_PX_PER_SEC / Math.max(fitPxPerSec, 0.001);
				const next = clamp(z * factor, 1, maxZoom);
				const rect = viewportRef.current?.getBoundingClientRect();
				if (!rect) return next;
				// Anchor: keep the source-time under the cursor stationary
				// across the zoom.
				const anchorOffsetPx = clamp(event.clientX - rect.left, 0, rect.width);
				const sourceAtAnchor =
					visibleStartSec + (anchorOffsetPx - TIMELINE_START_GUTTER_PX) / Math.max(pxPerSec, 0.001);
				const nextPxPerSec = clamp(fitPxPerSec * next, fitPxPerSec, MAX_PX_PER_SEC);
				const nextVisibleDurationSec = clamp(
					usableWidthPx / Math.max(nextPxPerSec, 0.001),
					0,
					sourceDuration,
				);
				const maxVisibleStartSec = Math.max(0, sourceDuration - nextVisibleDurationSec);
				setVisibleStartSec(
					clamp(
						sourceAtAnchor - (anchorOffsetPx - TIMELINE_START_GUTTER_PX) / nextPxPerSec,
						0,
						maxVisibleStartSec,
					),
				);
				return Number(next.toFixed(3));
			});
		},
		[fitPxPerSec, pxPerSec, sourceDuration, usableWidthPx, visibleStartSec],
	);

	return (
		<section className={styles.pane}>
			<div
				ref={viewportRef}
				className={styles.viewport}
				onPointerDown={startScrub}
				onDragOver={handleDragOver}
				onDragLeave={() => setDropIndex(null)}
				onDrop={handleDrop}
				onWheel={handleWheel}
				aria-label="Source timeline. Click and drag to scrub, Ctrl+wheel to zoom."
			>
				{clips.length === 0 ? (
					<div className={styles.empty} data-drop-active={dropIndex !== null}>
						Drag a video from the media panel here to start your timeline.
					</div>
				) : (
					<div
						className={styles.canvas}
						style={{
							width: contentWidthPx,
							transform: `translateX(${-canvasOffsetPx}px)`,
						}}
					>
						<div className={styles.ruler}>
							{ticks.map((tick) => (
								<div
									key={`${tick.timeSec}-${tick.major ? "m" : "n"}`}
									className={tick.major ? `${styles.tick} ${styles.major}` : styles.tick}
									style={{
										left: TIMELINE_START_GUTTER_PX + tick.timeSec * pxPerSec,
									}}
								>
									{tick.major ? <span>{formatSeconds(tick.timeSec)}</span> : null}
								</div>
							))}
						</div>
						<div className={styles.trackLane}>
							{orderedClips.map((clip, i) => {
								const durationSec = Math.max(0.001, clip.timelineEndSec - clip.timelineStartSec);
								const rawSegs = clipSegments(clip, skipRanges);
								const segs = rawSegs.map((s) => {
									if (s.kind !== "cut" || s.skipId !== dragPreview?.skipId) return s;
									return {
										...s,
										startSec: dragPreview.startSec,
										endSec: dragPreview.endSec,
										len: dragPreview.endSec - dragPreview.startSec,
									};
								});
								const segTotal = segs.reduce((m, s) => m + s.len, 0) || 1;
								const selected = clip.id === selectedClipId;
								const clipLeftPx = TIMELINE_START_GUTTER_PX + clip.timelineStartSec * pxPerSec;
								const clipWidthPx = Math.max(1, durationSec * pxPerSec);
								return (
									<div
										key={clip.id}
										data-clip-idx={i}
										className={
											selected ? `${styles.trackBlock} ${styles.selected}` : styles.trackBlock
										}
										style={{
											left: clipLeftPx,
											width: clipWidthPx,
										}}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.setData(CLIP_MIME, String(i));
											e.dataTransfer.effectAllowed = "move";
										}}
										onClick={() => onSelectClip(clip.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onSelectClip(clip.id);
											}
										}}
										role="button"
										tabIndex={0}
										aria-pressed={selected}
										title={`${assetLabel(clip.assetId)} · ${formatSeconds(clip.timelineStartSec)}–${formatSeconds(clip.timelineEndSec)}`}
									>
										<div className={styles.trackVisual}>
											{segs.map((s, si) =>
												s.kind === "keep" ? (
													<div
														key={si}
														className={`${styles.segment} ${styles.keep}`}
														aria-hidden="true"
														style={{ flexGrow: (s.len / segTotal) * 100 }}
													/>
												) : (
													<div
														key={s.skipId}
														className={`${styles.segment} ${styles.cut}`}
														style={{ flexGrow: (s.len / segTotal) * 100 }}
														onPointerEnter={() => showCutControls(s.skipId)}
														onPointerLeave={() => scheduleHideCutControls(s.skipId)}
														title={`Skip ${formatSeconds(s.startSec)}–${formatSeconds(s.endSec)}`}
													>
														{hoveredCutId === s.skipId || dragPreview?.skipId === s.skipId ? (
															<div
																className={styles.skipControls}
																onPointerEnter={() => showCutControls(s.skipId)}
																onPointerLeave={() => scheduleHideCutControls(s.skipId)}
															>
																<button
																	type="button"
																	className={styles.skipControlBtn}
																	aria-label={`Adjust skip start at ${formatSeconds(s.startSec)}`}
																	title="Adjust skip start"
																	onPointerDown={(e) => startResizeSkip(clip.id, s, "start", e)}
																	onClick={(e) => e.stopPropagation()}
																>
																	<ChevronLeft size={13} />
																</button>
																<button
																	type="button"
																	className={`${styles.skipControlBtn} ${styles.skipControlDelete}`}
																	aria-label={`Remove skip ${formatSeconds(s.startSec)}–${formatSeconds(s.endSec)}`}
																	title="Remove skip"
																	onClick={(e) => {
																		e.stopPropagation();
																		onRemoveSkipRange(s.skipId);
																	}}
																>
																	<Trash2 size={12} />
																</button>
																<button
																	type="button"
																	className={styles.skipControlBtn}
																	aria-label={`Adjust skip end at ${formatSeconds(s.endSec)}`}
																	title="Adjust skip end"
																	onPointerDown={(e) => startResizeSkip(clip.id, s, "end", e)}
																	onClick={(e) => e.stopPropagation()}
																>
																	<ChevronRight size={13} />
																</button>
															</div>
														) : null}
													</div>
												),
											)}
										</div>
										<div className={styles.trackInfo}>
											<button
												type="button"
												className={styles.editIcon}
												aria-label="Edit clip"
												title="Edit clip in/out points"
												onClick={(e) => {
													e.stopPropagation();
													onEditClip(clip);
												}}
											>
												<Pencil size={13} />
											</button>
											<div className={styles.trackText}>
												<h3 className={styles.trackTitle}>{assetLabel(clip.assetId)}</h3>
												<p className={styles.trackSubtitle}>
													{formatSeconds(clip.timelineStartSec)} —{" "}
													{formatSeconds(clip.timelineEndSec)} <span>•</span> source{" "}
													{formatSeconds(clip.sourceStartSec)}–
													{formatSeconds(clip.sourceEndSec ?? clip.sourceStartSec)}
												</p>
											</div>
											<button
												type="button"
												className={styles.clipDelete}
												aria-label="Remove clip"
												title="Remove clip from timeline"
												onClick={(e) => {
													e.stopPropagation();
													onRemoveClip(clip.id);
												}}
											>
												<Trash2 size={13} />
											</button>
										</div>
									</div>
								);
							})}
							<div
								className={styles.playhead}
								style={{ left: TIMELINE_START_GUTTER_PX + currentTimeSec * pxPerSec }}
								aria-hidden="true"
							/>
							{dropMarkerLeftPx !== null ? (
								<div
									className={styles.dropMarker}
									style={{ left: dropMarkerLeftPx }}
									aria-hidden="true"
								/>
							) : null}
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
