import { describe, expect, test, vi } from "vitest";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

type Handler = (
	this: {
		hideThinkingBlock: boolean;
		settingsManager: { setHideThinkingBlock(hidden: boolean): void };
		updateThinkingBlockVisibility(): void;
		showStatus(message: string): void;
		showError(message: string): void;
	},
	argument?: string,
) => void;

function createFake() {
	return {
		hideThinkingBlock: false,
		settingsManager: { setHideThinkingBlock: vi.fn() },
		updateThinkingBlockVisibility: vi.fn(),
		showStatus: vi.fn(),
		showError: vi.fn(),
		setThinkingBlockVisibility: Reflect.get(InteractiveMode.prototype, "setThinkingBlockVisibility") as (
			this: unknown,
			hidden: boolean,
		) => void,
		toggleThinkingBlockVisibility: Reflect.get(InteractiveMode.prototype, "toggleThinkingBlockVisibility") as (
			this: unknown,
		) => void,
	};
}

describe("/thinking-blocks", () => {
	const handler = Reflect.get(InteractiveMode.prototype, "handleThinkingBlocksCommand") as Handler;

	test("toggles when no argument is given", () => {
		const fake = createFake();
		handler.call(fake);
		expect(fake.hideThinkingBlock).toBe(true);
		expect(fake.settingsManager.setHideThinkingBlock).toHaveBeenCalledWith(true);
		expect(fake.updateThinkingBlockVisibility).toHaveBeenCalled();

		handler.call(fake);
		expect(fake.hideThinkingBlock).toBe(false);
	});

	test("accepts hide/off and show/on", () => {
		const fake = createFake();

		handler.call(fake, "hide");
		expect(fake.hideThinkingBlock).toBe(true);
		handler.call(fake, "on");
		expect(fake.hideThinkingBlock).toBe(false);
		handler.call(fake, "off");
		expect(fake.hideThinkingBlock).toBe(true);
		handler.call(fake, "show");
		expect(fake.hideThinkingBlock).toBe(false);
		expect(fake.showError).not.toHaveBeenCalled();
	});

	test("reports unknown arguments without changing state", () => {
		const fake = createFake();
		handler.call(fake, "wat");
		expect(fake.showError).toHaveBeenCalled();
		expect(fake.settingsManager.setHideThinkingBlock).not.toHaveBeenCalled();
		expect(fake.hideThinkingBlock).toBe(false);
	});
});
