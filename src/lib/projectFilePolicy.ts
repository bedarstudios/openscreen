import { LEGACY_PROJECT_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION } from "../shared/productIdentity";

const SUPPORTED_PROJECT_EXTENSIONS = new Set<string>([
	PROJECT_FILE_EXTENSION,
	...LEGACY_PROJECT_FILE_EXTENSIONS,
]);

function extensionOf(filePath: string): string {
	const fileName = filePath.split(/[\\/]/).pop() ?? "";
	const extensionStart = fileName.lastIndexOf(".");
	return extensionStart < 0 ? "" : fileName.slice(extensionStart + 1).toLowerCase();
}

export function isSupportedProjectPath(filePath: string): boolean {
	return SUPPORTED_PROJECT_EXTENSIONS.has(extensionOf(filePath));
}

export function getProjectSavePath(existingPath?: string): string | undefined {
	return extensionOf(existingPath ?? "") === PROJECT_FILE_EXTENSION ? existingPath : undefined;
}
