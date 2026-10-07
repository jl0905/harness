import { describe, expect, test, vi } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../src/core/slash-commands.ts";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

type Toggle = (this: {
	hideThinkingBlock: boolean;
	settingsManager: { setHideThinkingBlock(hidden: boolean): void };
	updateThinkingBlockVisibility(): void;
	showStatus(message: string): void;
}) => void;

type FocusToggle = (this: {
	focusMode: boolean;
	hideThinkingBlock: boolean;
	settingsManager: { setHideThinkingBlock(hidden: boolean): void };
	updateThinkingBlockVisibility(): void;
	setToolsExpanded(expanded: boolean): void;
	showStatus(message: string): void;
	setThinkingBlockVisibility(hidden: boolean): void;
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

	test("toggles focus mode, hiding thinking and collapsing tools together", () => {
		const toggleFocus = Reflect.get(InteractiveMode.prototype, "toggleFocusMode") as FocusToggle;
		const fake = {
			focusMode: false,
			hideThinkingBlock: false,
			settingsManager: { setHideThinkingBlock: vi.fn() },
			updateThinkingBlockVisibility: vi.fn(),
			setToolsExpanded: vi.fn(),
			showStatus: vi.fn(),
			setThinkingBlockVisibility: Reflect.get(InteractiveMode.prototype, "setThinkingBlockVisibility") as (
				this: unknown,
				hidden: boolean,
			) => void,
		};

		toggleFocus.call(fake);
		expect(fake.focusMode).toBe(true);
		expect(fake.hideThinkingBlock).toBe(true);
		expect(fake.settingsManager.setHideThinkingBlock).toHaveBeenCalledWith(true);
		expect(fake.setToolsExpanded).toHaveBeenCalledWith(false);

		toggleFocus.call(fake);
		expect(fake.focusMode).toBe(false);
		expect(fake.hideThinkingBlock).toBe(false);
		expect(fake.setToolsExpanded).toHaveBeenLastCalledWith(true);
	});
});
