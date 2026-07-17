export interface HelperIdentity {
	currentEnv: string;
	legacyEnv: string;
	currentName: string;
	legacyName: string;
}

export const HELPER_IDENTITIES = {
	macCapture: {
		currentEnv: "SHOWHOW_SCK_CAPTURE_EXE",
		legacyEnv: "OPENSCREEN_SCK_CAPTURE_EXE",
		currentName: "showhow-screencapturekit-helper",
		legacyName: "openscreen-screencapturekit-helper",
	},
	macCursor: {
		currentEnv: "SHOWHOW_MAC_CURSOR_HELPER_EXE",
		legacyEnv: "OPENSCREEN_MAC_CURSOR_HELPER_EXE",
		currentName: "showhow-macos-cursor-helper",
		legacyName: "openscreen-macos-cursor-helper",
	},
	windowsCapture: {
		currentEnv: "SHOWHOW_WGC_CAPTURE_EXE",
		legacyEnv: "OPENSCREEN_WGC_CAPTURE_EXE",
		currentName: "showhow-wgc-capture.exe",
		legacyName: "wgc-capture.exe",
	},
	windowsCursor: {
		currentEnv: "SHOWHOW_CURSOR_SAMPLER_EXE",
		legacyEnv: "OPENSCREEN_CURSOR_SAMPLER_EXE",
		currentName: "showhow-cursor-sampler.exe",
		legacyName: "cursor-sampler.exe",
	},
} as const satisfies Record<string, HelperIdentity>;

export function resolveCompatibleEnv(
	env: Record<string, string | undefined>,
	current: string,
	legacy: string,
): string | undefined {
	return env[current]?.trim() || env[legacy]?.trim() || undefined;
}

export function orderedHelperNames(identity: HelperIdentity): [string, string] {
	return [identity.currentName, identity.legacyName];
}

export function orderedHelperCandidates(
	identity: HelperIdentity,
	env: Record<string, string | undefined>,
	resolveName: (name: string) => Array<string | null>,
): string[] {
	const override = resolveCompatibleEnv(env, identity.currentEnv, identity.legacyEnv);
	return [override, ...orderedHelperNames(identity).flatMap(resolveName)].filter(
		(candidate): candidate is string => Boolean(candidate),
	);
}
