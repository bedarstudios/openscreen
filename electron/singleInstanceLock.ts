import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LOCK_DIR_PREFIXES = ["showhow-single-instance", "openscreen-single-instance"];
const PID_FILE_NAME = "pid";
const EMPTY_LOCK_STALE_MS = 30_000;

export type StableInstanceLock = {
	lockDir: string;
	lockDirs: string[];
	release: () => void;
};

type LockOptions = {
	lockDir?: string;
	lockDirs?: string[];
	prefixes?: string[];
	pid?: number;
	now?: () => number;
};

function isProcessRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
}

function readLockPid(lockDir: string): number | null {
	try {
		const rawPid = fs.readFileSync(path.join(lockDir, PID_FILE_NAME), "utf8").trim();
		const pid = Number(rawPid);
		return Number.isInteger(pid) && pid > 0 ? pid : null;
	} catch {
		return null;
	}
}

function isEmptyLockStale(lockDir: string, now: () => number): boolean {
	try {
		const stat = fs.statSync(lockDir);
		return now() - stat.mtimeMs > EMPTY_LOCK_STALE_MS;
	} catch {
		return false;
	}
}

function releaseLock(lockDir: string, pid: number) {
	if (readLockPid(lockDir) !== pid) {
		return;
	}
	fs.rmSync(lockDir, { recursive: true, force: true });
}

function getCurrentUserLockKey() {
	if (typeof process.getuid === "function") {
		return `uid-${process.getuid()}`;
	}

	try {
		const username = os.userInfo().username.replace(/[^a-zA-Z0-9._-]/g, "_");
		return username || "default";
	} catch {
		return "default";
	}
}

export function getStableInstanceLockDirs(prefixes = LOCK_DIR_PREFIXES) {
	return prefixes.map((prefix) =>
		path.join(os.tmpdir(), `${prefix}-${getCurrentUserLockKey()}.lock`),
	);
}

export function getStableInstanceLockDir() {
	return getStableInstanceLockDirs()[0];
}

export function acquireStableInstanceLock(options: LockOptions = {}): StableInstanceLock | null {
	const lockDirs =
		options.lockDirs ??
		(options.lockDir ? [options.lockDir] : getStableInstanceLockDirs(options.prefixes));
	const pid = options.pid ?? process.pid;
	const now = options.now ?? Date.now;
	const acquired: string[] = [];

	for (const lockDir of lockDirs) {
		let didAcquire = false;
		for (let attempt = 0; attempt < 2; attempt += 1) {
			let createdDirectory = false;
			try {
				fs.mkdirSync(lockDir, { mode: 0o700 });
				createdDirectory = true;
				fs.writeFileSync(path.join(lockDir, PID_FILE_NAME), `${pid}\n`, { flag: "wx" });
				acquired.push(lockDir);
				didAcquire = true;
				break;
			} catch (error) {
				const code = (error as NodeJS.ErrnoException).code;
				if (createdDirectory) {
					fs.rmSync(lockDir, { recursive: true, force: true });
				}
				if (code !== "EEXIST") {
					for (const owned of acquired) releaseLock(owned, pid);
					throw error;
				}

				const existingPid = readLockPid(lockDir);
				if (existingPid && isProcessRunning(existingPid)) {
					for (const owned of acquired) releaseLock(owned, pid);
					return null;
				}
				if (!existingPid && !isEmptyLockStale(lockDir, now)) {
					for (const owned of acquired) releaseLock(owned, pid);
					return null;
				}

				fs.rmSync(lockDir, { recursive: true, force: true });
			}
		}
		if (!didAcquire) {
			for (const owned of acquired) releaseLock(owned, pid);
			return null;
		}
	}

	return {
		lockDir: acquired[0],
		lockDirs: [...acquired],
		release: () => {
			for (const lockDir of acquired) releaseLock(lockDir, pid);
		},
	};
}
