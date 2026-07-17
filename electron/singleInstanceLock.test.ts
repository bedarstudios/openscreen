import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireStableInstanceLock, getStableInstanceLockDirs } from "./singleInstanceLock";

const testDirs: string[] = [];

function createTestLockDir() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "openscreen-lock-test-"));
	testDirs.push(dir);
	return path.join(dir, "app.lock");
}

function createTestLockDirs() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "showhow-lock-test-"));
	testDirs.push(dir);
	return [path.join(dir, "showhow.lock"), path.join(dir, "openscreen.lock")];
}

afterEach(() => {
	vi.restoreAllMocks();
	for (const dir of testDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

describe("acquireStableInstanceLock", () => {
	it("uses stable Showhow and legacy lock prefixes by default", () => {
		expect(getStableInstanceLockDirs().map((dir) => path.basename(dir))).toEqual([
			expect.stringMatching(/^showhow-single-instance-.+\.lock$/),
			expect.stringMatching(/^openscreen-single-instance-.+\.lock$/),
		]);
	});

	it("acquires and releases both Showhow and legacy locks", () => {
		const lockDirs = createTestLockDirs();
		const lock = acquireStableInstanceLock({ lockDirs });
		expect(lockDirs.every((dir) => fs.existsSync(dir))).toBe(true);
		lock?.release();
		expect(lockDirs.every((dir) => !fs.existsSync(dir))).toBe(true);
	});

	it.each([
		0, 1,
	])("refuses collision on lock %s and cleans locks from this attempt", (collision) => {
		const lockDirs = createTestLockDirs();
		fs.mkdirSync(lockDirs[collision]);
		fs.writeFileSync(path.join(lockDirs[collision], "pid"), `${process.pid}\n`);
		expect(acquireStableInstanceLock({ lockDirs })).toBeNull();
		expect(fs.existsSync(lockDirs[collision])).toBe(true);
		for (const [index, dir] of lockDirs.entries()) {
			if (index !== collision) expect(fs.existsSync(dir)).toBe(false);
		}
	});

	it("reclaims a stale legacy lock while acquiring both locks", () => {
		const lockDirs = createTestLockDirs();
		fs.mkdirSync(lockDirs[1]);
		fs.writeFileSync(path.join(lockDirs[1], "pid"), "99999999\n");
		const lock = acquireStableInstanceLock({ lockDirs });
		expect(lock).not.toBeNull();
		expect(fs.readFileSync(path.join(lockDirs[1], "pid"), "utf8")).toBe(`${process.pid}\n`);
		lock?.release();
	});

	it("removes every directory created by the attempt when the second PID write fails", () => {
		const lockDirs = createTestLockDirs();
		const writeFileSync = fs.writeFileSync;
		let writes = 0;
		vi.spyOn(fs, "writeFileSync").mockImplementation((...args) => {
			writes += 1;
			if (writes === 2) {
				const error = new Error("PID write failed") as NodeJS.ErrnoException;
				error.code = "EIO";
				throw error;
			}
			return writeFileSync(...args);
		});

		expect(() => acquireStableInstanceLock({ lockDirs })).toThrow("PID write failed");
		expect(lockDirs.every((dir) => !fs.existsSync(dir))).toBe(true);
	});
	it("prevents a second lock while the owning process is still running", () => {
		const lockDir = createTestLockDir();
		const firstLock = acquireStableInstanceLock({ lockDir });

		expect(firstLock).not.toBeNull();
		expect(acquireStableInstanceLock({ lockDir })).toBeNull();

		firstLock?.release();
	});

	it("reclaims a stale lock when its process is gone", () => {
		const lockDir = createTestLockDir();
		fs.mkdirSync(lockDir);
		fs.writeFileSync(path.join(lockDir, "pid"), "99999999\n");

		const lock = acquireStableInstanceLock({ lockDir });

		expect(lock).not.toBeNull();
		expect(fs.readFileSync(path.join(lockDir, "pid"), "utf8")).toBe(`${process.pid}\n`);

		lock?.release();
	});

	it("does not remove a fresh empty lock directory", () => {
		const lockDir = createTestLockDir();
		fs.mkdirSync(lockDir);

		expect(acquireStableInstanceLock({ lockDir })).toBeNull();
		expect(fs.existsSync(lockDir)).toBe(true);
	});
});
