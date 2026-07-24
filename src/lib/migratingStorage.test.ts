import { describe, expect, it, vi } from "vitest";
import { readWithLegacyFallback, writeCurrent } from "./migratingStorage";

describe("migrating storage", () => {
	it("prefers Showhow data", () => {
		const storage = {
			getItem: vi.fn((key: string) => (key === "showhow" ? "new" : "old")),
		};

		expect(readWithLegacyFallback(storage, "showhow", "openscreen")).toBe("new");
		expect(storage.getItem).not.toHaveBeenCalledWith("openscreen");
	});

	it("copies a legacy value to the Showhow key without deleting the legacy key", () => {
		const values = new Map([["openscreen", "old"]]);
		const storage = {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => values.set(key, value)),
		};

		expect(readWithLegacyFallback(storage, "showhow", "openscreen")).toBe("old");
		expect(storage.setItem).toHaveBeenCalledWith("showhow", "old");
		expect(values.get("openscreen")).toBe("old");
	});

	it("writes only to the current key", () => {
		const storage = { setItem: vi.fn() };

		writeCurrent(storage, "showhow", "new");

		expect(storage.setItem).toHaveBeenCalledOnce();
		expect(storage.setItem).toHaveBeenCalledWith("showhow", "new");
	});

	it("propagates an exception reading the current key", () => {
		const error = new Error("current read failed");
		const storage = {
			getItem: vi.fn(() => {
				throw error;
			}),
			setItem: vi.fn(),
		};

		expect(() => readWithLegacyFallback(storage, "showhow", "openscreen")).toThrow(error);
	});

	it("propagates an exception reading the legacy key after a current miss", () => {
		const error = new Error("legacy read failed");
		const storage = {
			getItem: vi.fn((key: string) => {
				if (key === "showhow") return null;
				throw error;
			}),
			setItem: vi.fn(),
		};

		expect(() => readWithLegacyFallback(storage, "showhow", "openscreen")).toThrow(error);
	});

	it("propagates an exception copying a legacy value forward", () => {
		const error = new Error("copy failed");
		const storage = {
			getItem: vi.fn((key: string) => (key === "showhow" ? null : "old")),
			setItem: vi.fn(() => {
				throw error;
			}),
		};

		expect(() => readWithLegacyFallback(storage, "showhow", "openscreen")).toThrow(error);
	});

	it("propagates an exception writing the current key", () => {
		const error = new Error("write failed");
		const storage = {
			setItem: vi.fn(() => {
				throw error;
			}),
		};

		expect(() => writeCurrent(storage, "showhow", "new")).toThrow(error);
	});
});
