interface ReadStorage {
	getItem(key: string): string | null;
}

interface WriteStorage {
	setItem(key: string, value: string): void;
}

interface ReadWriteStorage extends ReadStorage, WriteStorage {}

export function readWithLegacyFallback(
	storage: ReadWriteStorage,
	currentKey: string,
	legacyKey: string,
): string | null {
	const current = storage.getItem(currentKey);
	if (current !== null) return current;

	const legacy = storage.getItem(legacyKey);
	if (legacy !== null) storage.setItem(currentKey, legacy);
	return legacy;
}

export function writeCurrent(storage: WriteStorage, currentKey: string, value: string): void {
	storage.setItem(currentKey, value);
}
