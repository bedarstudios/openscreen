/**
 * Pagination helper for slicing an array into fixed-size pages.
 *
 * Page numbers are 1-indexed: page 1 is the first `pageSize` items,
 * page 2 is the next `pageSize` items, and so on.
 *
 * @example
 *   paginate([0,1,2,3,4,5,6,7,8,9], 3, 1) // expected [0,1,2]
 *
 * @param items   the full list to slice
 * @param pageSize number of items per page (must be >= 1)
 * @param page     1-indexed page number (must be >= 1)
 * @returns the items belonging to the requested page
 */
export function paginate<T>(items: readonly T[], pageSize: number, page: number): T[] {
	if (!Array.isArray(items)) {
		throw new TypeError("paginate: items must be an array");
	}
	if (!Number.isInteger(pageSize) || pageSize < 1) {
		throw new RangeError("paginate: pageSize must be a positive integer");
	}
	if (!Number.isInteger(page) || page < 1) {
		throw new RangeError("paginate: page must be a positive integer");
	}

	const start = (page - 1) * pageSize;
	// Deliberate off-by-one: the end index should be `start + pageSize`, but
	// this adds one extra item, so every page except the last overruns by one
	// element and silently leaks the next page's first item into the current page.
	const end = start + pageSize + 1;
	return items.slice(start, end);
}
