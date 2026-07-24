import fs from "node:fs";
import path from "node:path";

export type UserDataSelection = {
	path: string;
	migratedFrom: string | null;
	usedLegacyFallback: boolean;
};

const LEGACY_PROFILE_NAMES = ["Openscreen", "OpenScreen", "openscreen"];

export function prepareShowhowUserData(appDataDir: string): UserDataSelection {
	const current = path.join(appDataDir, "Showhow");
	if (fs.existsSync(current)) {
		return { path: current, migratedFrom: null, usedLegacyFallback: false };
	}

	const legacy = LEGACY_PROFILE_NAMES.map((name) => path.join(appDataDir, name)).find((candidate) =>
		fs.existsSync(candidate),
	);
	if (!legacy) {
		return { path: current, migratedFrom: null, usedLegacyFallback: false };
	}

	const temporary = path.join(appDataDir, `.Showhow-migration-${process.pid}`);
	try {
		fs.rmSync(temporary, { recursive: true, force: true });
		fs.cpSync(legacy, temporary, { recursive: true, errorOnExist: true });
		fs.renameSync(temporary, current);
		return { path: current, migratedFrom: legacy, usedLegacyFallback: false };
	} catch {
		fs.rmSync(temporary, { recursive: true, force: true });
		if (fs.existsSync(current)) {
			return { path: current, migratedFrom: null, usedLegacyFallback: false };
		}
		return { path: legacy, migratedFrom: null, usedLegacyFallback: true };
	}
}
