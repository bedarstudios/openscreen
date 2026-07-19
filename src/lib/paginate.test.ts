import { describe, expect, it } from "vitest";

import { paginate } from "./paginate";

describe("paginate", () => {
	it("returns exactly one page of items without leaking into the next page", () => {
		const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

		expect(paginate(items, 3, 1)).toEqual([0, 1, 2]);
		expect(paginate(items, 3, 2)).toEqual([3, 4, 5]);
		expect(paginate(items, 3, 3)).toEqual([6, 7, 8]);
		expect(paginate(items, 3, 4)).toEqual([9]);
	});
});
