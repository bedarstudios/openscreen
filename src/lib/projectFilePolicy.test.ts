import { describe, expect, it } from "vitest";
import { getProjectSavePath, isSupportedProjectPath } from "./projectFilePolicy";

describe("renderer project file policy", () => {
	it.each([
		"demo.showhow",
		"demo.openscreen",
		"DEMO.SHOWHOW",
		"DEMO.OPENSCREEN",
	])("opens %s", (file) => {
		expect(isSupportedProjectPath(file)).toBe(true);
	});

	it("rejects unrelated files", () => {
		expect(isSupportedProjectPath("demo.json")).toBe(false);
	});

	it("forces Save As for a legacy project", () => {
		expect(getProjectSavePath("/tmp/demo.openscreen")).toBeUndefined();
		expect(getProjectSavePath("/tmp/demo.showhow")).toBe("/tmp/demo.showhow");
	});
});
