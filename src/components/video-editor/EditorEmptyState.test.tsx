import "@testing-library/jest-dom";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorEmptyState } from "./EditorEmptyState";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: () => (key: string) => key,
}));

vi.mock("@/lib/userPreferences", () => ({
	getProjectFolder: vi.fn(),
	parentDirectoryOf: vi.fn(),
	saveUserPreferences: vi.fn(),
}));

describe("EditorEmptyState project drops", () => {
	beforeEach(() => {
		window.electronAPI = {
			...window.electronAPI,
			getPathForFile: vi.fn().mockReturnValue("/tmp/demo.showhow"),
			loadProjectFileFromPath: vi.fn().mockResolvedValue({
				success: true,
				path: "/tmp/demo.showhow",
				project: { version: 1 },
			}),
		} as typeof window.electronAPI;
	});

	it.each(["demo.showhow", "demo.openscreen"])("opens a dropped %s project", async (name) => {
		const onProjectOpened = vi.fn();
		const { container } = render(
			<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={onProjectOpened} />,
		);

		const file = new File(["{}"], name, { type: "application/json" });
		fireEvent.drop(container.firstElementChild as HTMLElement, {
			dataTransfer: { files: [file] },
		});

		await waitFor(() => {
			expect(onProjectOpened).toHaveBeenCalledWith({ version: 1 }, "/tmp/demo.showhow");
		});
	});

	it("renders the Showhow product image", () => {
		const { container } = render(
			<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />,
		);

		const imageSources = Array.from(container.querySelectorAll("img")).map((image) =>
			image.getAttribute("src"),
		);
		expect(imageSources).toContain("/showhow.png");
		expect(imageSources).not.toContain("./openscreen.png");
	});
});
