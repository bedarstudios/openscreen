import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: () => (key: string) => key,
}));

describe("UnsavedChangesDialog", () => {
	it("renders the Showhow product image", () => {
		render(
			<UnsavedChangesDialog
				isOpen
				onSaveAndClose={vi.fn()}
				onDiscardAndClose={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(document.body.querySelector("img")).toHaveAttribute("src", "/showhow.png");
	});
});
