import { describe, expect, test, vi } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../src/core/slash-commands.ts";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

type Toggle = (this: {
	hideThinkingBlock: boolean;
	settingsManager: { setHideThinkingBlock(hidden: boolean): void };
	updateThinkingBlockVisibility(): void;
	showStatus(message: string): void;
}) => void;

describe("/toggle-focus", () => {
	test("is registered as a no-argument built-in command", () => {
		const command = BUILTIN_SLASH_COMMANDS.find((candidate) => candidate.name === "toggle-focus");
		expect(command).toBeDefined();
		expect(command?.argumentHint).toBeUndefined();
		expect(BUILTIN_SLASH_COMMANDS.some((candidate) => candidate.name === "thinking-blocks")).toBe(false);
	});

	test("toggles thinking block visibility", () => {
		const toggle = Reflect.get(InteractiveMode.prototype, "toggleThinkingBlockVisibility") as Toggle;
		const fake = {
			hideThinkingBlock: false,
			settingsManager: { setHideThinkingBlock: vi.fn() },
			updateThinkingBlockVisibility: vi.fn(),
			showStatus: vi.fn(),
		};

		toggle.call(fake);
		expect(fake.hideThinkingBlock).toBe(true);
		expect(fake.settingsManager.setHideThinkingBlock).toHaveBeenCalledWith(true);
		expect(fake.updateThinkingBlockVisibility).toHaveBeenCalled();

		toggle.call(fake);
		expect(fake.hideThinkingBlock).toBe(false);
		expect(fake.settingsManager.setHideThinkingBlock).toHaveBeenLastCalledWith(false);
	});
});
