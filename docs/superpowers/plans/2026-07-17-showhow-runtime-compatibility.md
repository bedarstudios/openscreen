# Showhow Runtime Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Showhow the only writer of new product identifiers while retaining tested reads for
legacy OpenScreen projects, browser storage, caches, application data, and native helpers.

**Architecture:** Central identity constants feed small migration helpers. Renderer storage uses a
Showhow-first/legacy-fallback adapter. Project dialogs write `.showhow` while accepting both file
extensions. Native helper resolution tries new variables/names first and legacy aliases second.

**Tech Stack:** TypeScript, Electron IPC, React, Vitest, OPFS, SwiftPM, CMake.

## Global Constraints

- New project extension: `.showhow`; legacy `.openscreen` is read-only compatibility.
- New keys: `showhow_*`; legacy keys are never overwritten or deleted automatically.
- New environment variables: `SHOWHOW_*`; legacy `OPENSCREEN_*` values remain fallback inputs.
- Preserve `<video path>.cursor.json` unchanged.
- Add a failing test before each behavior change.

---

### Task 1: Centralize product and compatibility constants

**Files:**
- Create: `src/shared/productIdentity.ts`
- Create: `src/shared/productIdentity.test.ts`

**Interfaces:**
- Produces: `PRODUCT_NAME`, `PACKAGE_NAME`, `APP_ID`, `PROJECT_FILE_EXTENSION`,
  `LEGACY_PROJECT_FILE_EXTENSIONS`, `STORAGE_KEYS`, `LEGACY_STORAGE_KEYS`, `NATIVE_HELPERS`.

- [ ] **Step 1: Write the failing constants test**

```ts
import { describe, expect, it } from "vitest";
import {
	APP_ID,
	LEGACY_PROJECT_FILE_EXTENSIONS,
	NATIVE_HELPERS,
	PRODUCT_NAME,
	PROJECT_FILE_EXTENSION,
	STORAGE_KEYS,
} from "./productIdentity";

describe("Showhow product identity", () => {
	it("uses Showhow for every new identifier", () => {
		expect(PRODUCT_NAME).toBe("Showhow");
		expect(APP_ID).toBe("com.bedarstudios.showhow");
		expect(PROJECT_FILE_EXTENSION).toBe("showhow");
		expect(STORAGE_KEYS.preferences).toBe("showhow_user_preferences");
		expect(NATIVE_HELPERS.macCapture).toBe("showhow-screencapturekit-helper");
	});

	it("keeps openscreen only in legacy readers", () => {
		expect(LEGACY_PROJECT_FILE_EXTENSIONS).toEqual(["openscreen"]);
	});
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/shared/productIdentity.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the constants**

```ts
export const PRODUCT_NAME = "Showhow";
export const PACKAGE_NAME = "showhow-desktop";
export const APP_ID = "com.bedarstudios.showhow";
export const PROJECT_FILE_EXTENSION = "showhow";
export const LEGACY_PROJECT_FILE_EXTENSIONS = ["openscreen"] as const;

export const STORAGE_KEYS = {
	preferences: "showhow_user_preferences",
	customFonts: "showhow_custom_fonts",
	locale: "showhow-locale",
	sourceCache: "showhow-source-cache",
} as const;

export const LEGACY_STORAGE_KEYS = {
	preferences: "openscreen_user_preferences",
	customFonts: "openscreen_custom_fonts",
	locale: "openscreen-locale",
	sourceCache: "openscreen-source-cache",
} as const;

export const NATIVE_HELPERS = {
	macCapture: "showhow-screencapturekit-helper",
	macCursor: "showhow-macos-cursor-helper",
	windowsCapture: "showhow-wgc-capture.exe",
	windowsCursor: "showhow-cursor-sampler.exe",
} as const;
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/shared/productIdentity.test.ts`

Expected: PASS, 2 tests.

```bash
git add src/shared/productIdentity.ts src/shared/productIdentity.test.ts
git commit -m "refactor: centralize Showhow identity constants"
```

### Task 2: Write `.showhow` projects and read both formats

**Files:**
- Create: `electron/projectFilePolicy.ts`
- Create: `electron/projectFilePolicy.test.ts`
- Modify: `electron/ipc/handlers.ts`
- Create: `src/lib/projectFilePolicy.ts`
- Create: `src/lib/projectFilePolicy.test.ts`
- Modify: `src/components/video-editor/EditorEmptyState.tsx`
- Modify: `src/components/video-editor/EditorEmptyState.test.tsx`
- Modify: `src/i18n/locales/*/dialogs.json`
- Modify: `src/i18n/locales/*/editor.json`

**Interfaces:**
- Produces: `isSupportedProjectPath(path: string): boolean`.
- Produces: `getProjectSavePath(existingPath?: string): string | undefined`, returning `undefined`
  for `.openscreen` so the first save uses Save As.

- [ ] **Step 1: Write policy tests**

```ts
import { describe, expect, it } from "vitest";
import { getWritableExistingProjectPath, isSupportedProjectPath } from "./projectFilePolicy";

describe("project file policy", () => {
	it.each(["demo.showhow", "demo.openscreen"])("opens %s", (file) => {
		expect(isSupportedProjectPath(file)).toBe(true);
	});

	it("forces Save As for a legacy project", () => {
		expect(getWritableExistingProjectPath("/tmp/demo.openscreen")).toBeUndefined();
		expect(getWritableExistingProjectPath("/tmp/demo.showhow")).toBe("/tmp/demo.showhow");
	});
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run electron/projectFilePolicy.test.ts src/lib/projectFilePolicy.test.ts`

Expected: FAIL because both policy modules are absent.

- [ ] **Step 3: Implement shared behavior in each process boundary**

```ts
import path from "node:path";
import { LEGACY_PROJECT_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION } from "../src/shared/productIdentity";

const SUPPORTED = new Set([PROJECT_FILE_EXTENSION, ...LEGACY_PROJECT_FILE_EXTENSIONS]);

export function isSupportedProjectPath(filePath: string): boolean {
	return SUPPORTED.has(path.extname(filePath).slice(1).toLowerCase());
}

export function getWritableExistingProjectPath(filePath?: string): string | undefined {
	return filePath?.toLowerCase().endsWith(`.${PROJECT_FILE_EXTENSION}`) ? filePath : undefined;
}
```

The renderer helper uses the same extension set against `File.name` without importing Node `path`.

- [ ] **Step 4: Update save/open/drop flows**

Replace the local `PROJECT_FILE_EXTENSION` in `electron/ipc/handlers.ts` with the shared constant.
Open-dialog extensions must be `["showhow", "openscreen"]`; save-dialog extensions must be
`["showhow"]`. Pass `getWritableExistingProjectPath(currentProjectPath)` when saving. Update drag
and drop to accept both extensions. Rename translation key `openscreenProject` to `showhowProject`
in all locales and mention both supported extensions in open/drop help.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run electron/projectFilePolicy.test.ts src/lib/projectFilePolicy.test.ts src/components/video-editor/EditorEmptyState.test.tsx`

Expected: PASS.

Run: `npm run i18n:check && npx tsc --noEmit`

Expected: both exit `0`.

```bash
git add electron/projectFilePolicy.ts electron/projectFilePolicy.test.ts electron/ipc/handlers.ts \
  src/lib/projectFilePolicy.ts src/lib/projectFilePolicy.test.ts \
  src/components/video-editor/EditorEmptyState.tsx \
  src/components/video-editor/EditorEmptyState.test.tsx src/i18n/locales
git commit -m "feat: save Showhow projects with legacy import support"
```

### Task 3: Migrate renderer storage without deleting legacy data

**Files:**
- Create: `src/lib/migratingStorage.ts`
- Create: `src/lib/migratingStorage.test.ts`
- Modify: `src/lib/userPreferences.ts`
- Modify: `src/lib/userPreferences.test.ts`
- Modify: `src/lib/customFonts.ts`
- Create: `src/lib/customFonts.test.ts`
- Modify: `src/i18n/config.ts`
- Modify: `src/contexts/I18nContext.tsx`
- Create: `src/contexts/I18nContext.test.tsx`

**Interfaces:**
- Produces: `readWithLegacyFallback(storage, currentKey, legacyKey): string | null`.
- Produces: `writeCurrent(storage, currentKey, value): void`.

- [ ] **Step 1: Write migration tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { readWithLegacyFallback } from "./migratingStorage";

it("prefers Showhow data", () => {
	const storage = { getItem: vi.fn((key) => (key === "showhow" ? "new" : "old")) };
	expect(readWithLegacyFallback(storage, "showhow", "openscreen")).toBe("new");
});

it("copies a legacy value to the Showhow key without deleting the legacy key", () => {
	const values = new Map([["openscreen", "old"]]);
	const storage = {
		getItem: vi.fn((key) => values.get(key) ?? null),
		setItem: vi.fn((key, value) => values.set(key, value)),
	};
	expect(readWithLegacyFallback(storage, "showhow", "openscreen")).toBe("old");
	expect(storage.setItem).toHaveBeenCalledWith("showhow", "old");
	expect(values.get("openscreen")).toBe("old");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/lib/migratingStorage.test.ts`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the adapter**

```ts
interface ReadWriteStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

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
```

- [ ] **Step 4: Route preferences, fonts, and locale through it**

Use constants from `productIdentity.ts`. All saves target current keys. Add focused tests proving
legacy preference/font/locale data is read, copied to the new key, and not removed.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run src/lib/migratingStorage.test.ts src/lib/userPreferences.test.ts src/lib/customFonts.test.ts src/contexts/I18nContext.test.tsx`

Expected: PASS.

```bash
git add src/lib/migratingStorage.ts src/lib/migratingStorage.test.ts src/lib/userPreferences.ts \
  src/lib/userPreferences.test.ts src/lib/customFonts.ts src/lib/customFonts.test.ts \
  src/i18n/config.ts src/contexts/I18nContext.tsx src/contexts/I18nContext.test.tsx
git commit -m "feat: migrate legacy renderer storage to Showhow"
```

### Task 4: Add OPFS cache fallback

**Files:**
- Modify: `src/lib/exporter/localSourceFile.ts`
- Modify: `src/lib/exporter/localSourceFile.test.ts`

**Interfaces:**
- Produces: Showhow cache writes in `showhow-source-cache`.
- Consumes: `LEGACY_STORAGE_KEYS.sourceCache` for read-only fallback.

- [ ] **Step 1: Add a failing legacy-cache test**

Add a fixture with a media file only under `openscreen-source-cache`; assert resolution reads it,
copies it to `showhow-source-cache`, and leaves the legacy file intact.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/lib/exporter/localSourceFile.test.ts`

Expected: FAIL because only `openscreen-source-cache` is consulted.

- [ ] **Step 3: Implement Showhow-first fallback**

Replace the single cache constant with `STORAGE_KEYS.sourceCache`. On a miss, check
`LEGACY_STORAGE_KEYS.sourceCache`; copy the file into the current cache when found; never remove the
legacy entry.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/lib/exporter/localSourceFile.test.ts`

Expected: PASS.

```bash
git add src/lib/exporter/localSourceFile.ts src/lib/exporter/localSourceFile.test.ts
git commit -m "feat: migrate legacy source cache on read"
```

### Task 5: Migrate the Electron profile and instance identity

**Files:**
- Create: `electron/userDataMigration.ts`
- Create: `electron/userDataMigration.test.ts`
- Create: `electron/bootstrap.ts`
- Modify: `electron/main.ts`
- Modify: `electron/singleInstanceLock.ts`
- Modify: `electron/singleInstanceLock.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: `prepareShowhowUserData(appDataDir: string): UserDataSelection`.
- Produces: `{ path: string; migratedFrom: string | null; usedLegacyFallback: boolean }`.
- Produces: a stable Showhow instance lock that also refuses startup while the legacy lock is held.

- [ ] **Step 1: Write profile-selection tests**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { prepareShowhowUserData } from "./userDataMigration";

it("copies the legacy profile once and leaves its source intact", () => {
	const appData = fs.mkdtempSync(path.join(os.tmpdir(), "showhow-profile-"));
	const legacy = path.join(appData, "Openscreen");
	fs.mkdirSync(legacy);
	fs.writeFileSync(path.join(legacy, "Preferences"), "legacy");
	const result = prepareShowhowUserData(appData);
	expect(result.path).toBe(path.join(appData, "Showhow"));
	expect(fs.readFileSync(path.join(result.path, "Preferences"), "utf8")).toBe("legacy");
	expect(fs.existsSync(path.join(legacy, "Preferences"))).toBe(true);
});

it("never overwrites an existing Showhow profile", () => {
	const appData = fs.mkdtempSync(path.join(os.tmpdir(), "showhow-profile-"));
	fs.mkdirSync(path.join(appData, "Showhow"));
	expect(prepareShowhowUserData(appData).migratedFrom).toBeNull();
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run electron/userDataMigration.test.ts electron/singleInstanceLock.test.ts`

Expected: FAIL because the migration module and dual-lock behavior are absent.

- [ ] **Step 3: Implement copy-once profile selection**

```ts
import fs from "node:fs";
import path from "node:path";

export type UserDataSelection = {
	path: string;
	migratedFrom: string | null;
	usedLegacyFallback: boolean;
};

export function prepareShowhowUserData(appDataDir: string): UserDataSelection {
	const current = path.join(appDataDir, "Showhow");
	const legacyCandidates = ["Openscreen", "OpenScreen", "openscreen"].map((name) =>
		path.join(appDataDir, name),
	);
	if (fs.existsSync(current)) return { path: current, migratedFrom: null, usedLegacyFallback: false };
	const legacy = legacyCandidates.find((candidate) => fs.existsSync(candidate));
	if (!legacy) return { path: current, migratedFrom: null, usedLegacyFallback: false };
	try {
		fs.cpSync(legacy, current, { recursive: true, errorOnExist: true });
		return { path: current, migratedFrom: legacy, usedLegacyFallback: false };
	} catch {
		return { path: legacy, migratedFrom: null, usedLegacyFallback: true };
	}
}
```

- [ ] **Step 4: Bootstrap the profile before importing the main-process graph**

Static imports in `electron/main.ts` currently evaluate `electron/ipc/handlers.ts`, which reads
`app.getPath("userData")` at module load. Create a bootstrap entry that sets the profile before a
dynamic import:

```ts
import { app } from "electron";
import { prepareShowhowUserData } from "./userDataMigration";

app.setName("Showhow");
const selection = prepareShowhowUserData(app.getPath("appData"));
app.setPath("userData", selection.path);
console.info("Showhow user-data profile:", selection.path);
if (selection.migratedFrom) console.info("Migrated legacy profile from:", selection.migratedFrom);
if (selection.usedLegacyFallback) console.warn("Using legacy profile because migration failed");

await import("./main");
```

Change the Vite Electron main entry from `electron/main.ts` to `electron/bootstrap.ts`. Keep
`electron/main.ts` free of profile setup so no later refactor can accidentally run it after handler
imports. Log only source and destination paths; never profile contents.

- [ ] **Step 5: Acquire both new and legacy stable locks**

Change `acquireStableInstanceLock` to accept `prefixes = ["showhow-single-instance",
"openscreen-single-instance"]`. Acquire both atomically; if either live lock exists, release any
lock acquired during this attempt and return `null`. Add tests for new-lock collision,
legacy-lock collision, stale legacy cleanup, and release of both locks.

- [ ] **Step 6: Verify and commit**

Run: `npx vitest run electron/userDataMigration.test.ts electron/singleInstanceLock.test.ts`

Expected: PASS.

```bash
git add electron/userDataMigration.ts electron/userDataMigration.test.ts electron/bootstrap.ts \
  electron/main.ts electron/singleInstanceLock.ts electron/singleInstanceLock.test.ts vite.config.ts
git commit -m "feat: migrate the Electron profile to Showhow"
```

### Task 6: Migrate native helper names and environment variables atomically

**Files:**
- Create: `electron/native-bridge/helperIdentity.ts`
- Create: `electron/native-bridge/helperIdentity.test.ts`
- Modify: `electron/native-bridge/cursor/recording/macNativeCursorRecordingSession.ts`
- Modify: `electron/native-bridge/cursor/recording/windowsNativeRecordingSession.ts`
- Modify: `electron/ipc/handlers.ts`
- Modify: `electron/native/screencapturekit/Package.swift`
- Rename: `electron/native/screencapturekit/Sources/OpenScreenScreenCaptureKitHelper/` → `.../ShowhowScreenCaptureKitHelper/`
- Rename: `electron/native/screencapturekit/Sources/OpenScreenMacOSCursorHelper/` → `.../ShowhowMacOSCursorHelper/`
- Modify: `scripts/build-macos-screencapturekit-helper.mjs`
- Modify: `scripts/build-windows-wgc-helper.mjs`
- Modify: `scripts/test-windows-wgc-helper.mjs`
- Modify: `scripts/diagnostic-tool/diagnostic.mjs`
- Modify: `electron/native/wgc-capture/CMakeLists.txt`

**Interfaces:**
- Produces: `resolveEnv(primary: string, legacy: string): string | undefined`.
- Produces ordered helper candidates: Showhow environment override/name first, OpenScreen fallback
  second.

- [ ] **Step 1: Write ordered-resolution tests**

```ts
import { expect, it } from "vitest";
import { resolveCompatibleEnv } from "./helperIdentity";

it("prefers the Showhow helper override", () => {
	expect(resolveCompatibleEnv({ SHOWHOW_HELPER: "/new", OPENSCREEN_HELPER: "/old" }, "SHOWHOW_HELPER", "OPENSCREEN_HELPER")).toBe("/new");
});

it("falls back to the legacy helper override", () => {
	expect(resolveCompatibleEnv({ OPENSCREEN_HELPER: "/old" }, "SHOWHOW_HELPER", "OPENSCREEN_HELPER")).toBe("/old");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run electron/native-bridge/helperIdentity.test.ts`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement resolution and rename build outputs**

Use `SHOWHOW_SCK_CAPTURE_EXE`, `SHOWHOW_MAC_CURSOR_HELPER_EXE`,
`SHOWHOW_WGC_CAPTURE_EXE`, and `SHOWHOW_CURSOR_SAMPLER_EXE` first. Retain corresponding
`OPENSCREEN_*` fallbacks. Rename Swift products/targets and Windows outputs to the canonical helper
names; candidate arrays must also include old packaged filenames after the new names.

- [ ] **Step 4: Update native source identity without changing protocols**

Rename Swift entrypoint structs and queue labels to `com.bedarstudios.showhow.*`. Rename the CMake
project and filter labels. Do not change JSON request/response schemas, exit codes, cursor telemetry
filenames, or recording output behavior.

- [ ] **Step 5: Verify available platforms and commit**

Run on macOS: `npm run build:native:mac`

Expected: new capture and cursor helpers exist under `electron/native/bin/darwin-<arch>/`.

Run: `npx vitest run electron/native-bridge/helperIdentity.test.ts && npx tsc --noEmit`

Expected: PASS.

```bash
git add electron/native electron/native-bridge electron/ipc/handlers.ts scripts
git commit -m "refactor: migrate native helpers to Showhow identity"
```

### Task 7: Run the compatibility acceptance gate

**Files:**
- Modify: `config/branding-allowlist.json`
- Create: `docs/testing/showhow-legacy-compatibility.md`

- [ ] **Step 1: Document the fixture matrix**

Include clean install, legacy preferences, legacy fonts, legacy OPFS cache, `.openscreen` open then
Save As `.showhow`, new `.showhow` reopen, legacy native env override, and new native env override.

- [ ] **Step 2: Run the automated gate**

```bash
npm run test
npm run test:browser
npm run i18n:check
npx tsc --noEmit
npm run lint
npm run branding:check
git diff --check
```

Expected: all exit `0`; remaining OpenScreen code matches are only documented fallback readers.

- [ ] **Step 3: Commit the verified compatibility record**

```bash
git add config/branding-allowlist.json docs/testing/showhow-legacy-compatibility.md
git commit -m "test: document Showhow legacy compatibility gate"
```
