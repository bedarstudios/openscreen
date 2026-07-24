export { isSupportedProjectPath } from "../src/lib/projectFilePolicy";

import { getProjectSavePath } from "../src/lib/projectFilePolicy";
import {
	LEGACY_PROJECT_FILE_EXTENSIONS,
	PROJECT_FILE_EXTENSION,
} from "../src/shared/productIdentity";

export const PROJECT_SAVE_FILTER_EXTENSIONS = [[PROJECT_FILE_EXTENSION], ["json"]];
export const PROJECT_OPEN_FILTER_EXTENSIONS = [
	[PROJECT_FILE_EXTENSION, ...LEGACY_PROJECT_FILE_EXTENSIONS],
	["json"],
	["*"],
];

export function getDefaultProjectFileName(
	suggestedName?: string,
	fallbackName = "project",
): string {
	const candidate = suggestedName || fallbackName;
	const projectSuffix = `.${PROJECT_FILE_EXTENSION}`;
	const baseName = candidate.toLowerCase().endsWith(projectSuffix)
		? candidate.slice(0, -projectSuffix.length)
		: candidate;
	const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
	return `${safeName}.${PROJECT_FILE_EXTENSION}`;
}

export function getWritableExistingProjectPath(filePath?: string): string | undefined {
	return getProjectSavePath(filePath);
}
