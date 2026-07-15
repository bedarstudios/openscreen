import { describe, expect, it, vi } from "vitest";
import { createAppWindowReadinessGate } from "./appWindowReadiness";

describe("createAppWindowReadinessGate", () => {
	it("defers an early activation until startup is ready", () => {
		const showWindow = vi.fn();
		const gate = createAppWindowReadinessGate(showWindow);

		gate.request();
		expect(showWindow).not.toHaveBeenCalled();

		gate.markReady();
		expect(showWindow).toHaveBeenCalledTimes(1);
	});

	it("shows immediately after startup is ready", () => {
		const showWindow = vi.fn();
		const gate = createAppWindowReadinessGate(showWindow);
		gate.markReady();

		gate.request();

		expect(showWindow).toHaveBeenCalledTimes(1);
	});
});
