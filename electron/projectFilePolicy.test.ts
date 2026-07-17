import { describe, expect, it } from "vitest";
import {
	getDefaultProjectFileName,
	getWritableExistingProjectPath,
	isSupportedProjectPath,
	PROJECT_OPEN_FILTER_EXTENSIONS,
	PROJECT_SAVE_FILTER_EXTENSIONS,
} from "./projectFilePolicy";

describe("project file policy", () => {
	it.each([
		"demo.showhow",
		"demo.openscreen",
		"DEMO.SHOWHOW",
		"DEMO.OPENSCREEN",
	])("opens %s", (file) => {
		expect(isSupportedProjectPath(file)).toBe(true);
	});

	it("defaults new project names to the Showhow extension", () => {
		expect(getDefaultProjectFileName("demo.mov")).toBe("demo_mov.showhow");
		expect(getDefaultProjectFileName("demo.showhow")).toBe("demo.showhow");
	});

	it("forces Save As for a legacy project", () => {
		expect(getWritableExistingProjectPath("/tmp/demo.openscreen")).toBeUndefined();
		expect(getWritableExistingProjectPath("/tmp/demo.showhow")).toBe("/tmp/demo.showhow");
	});

	it("defines save filters for Showhow projects and JSON", () => {
		expect(PROJECT_SAVE_FILTER_EXTENSIONS).toEqual([["showhow"], ["json"]]);
	});

	it("defines open filters for both project formats, JSON, and all files", () => {
		expect(PROJECT_OPEN_FILTER_EXTENSIONS).toEqual([["showhow", "openscreen"], ["json"], ["*"]]);
	});
});
