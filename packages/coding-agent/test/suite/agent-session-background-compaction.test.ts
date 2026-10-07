import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { userMsg } from "../utilities.ts";
import { createHarness, getMessageText, getUserTexts, type Harness } from "./harness.ts";

describe("background compaction", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	it("preserves messages appended while the summary is in flight", async () => {
		let markCompactionStarted = () => {};
		const compactionStarted = new Promise<void>((resolve) => {
			markCompactionStarted = resolve;
		});
		let releaseCompaction = () => {};
		const compactionReleased = new Promise<void>((resolve) => {
			releaseCompaction = resolve;
		});

		const harness = await createHarness({
			settings: { compaction: { keepRecentTokens: 1 } },
			extensionFactories: [
				(pi) => {
					pi.on("session_before_compact", async (event) => {
						markCompactionStarted();
						await compactionReleased;
						return {
							compaction: {
								summary: "background summary",
								firstKeptEntryId: event.preparation.firstKeptEntryId,
								tokensBefore: event.preparation.tokensBefore,
								details: {},
							},
						};
					});
				},
			],
		});
		harnesses.push(harness);
		harness.setResponses([
			fauxAssistantMessage("response one"),
			fauxAssistantMessage("response two"),
			fauxAssistantMessage("response three"),
			fauxAssistantMessage("response four"),
		]);

		await harness.session.prompt("one");
		await harness.session.prompt("two");
		await harness.session.prompt("three");

		const compactPromise = harness.session.compact();
		await compactionStarted;

		// The model keeps working while the summary is in flight.
		await harness.session.prompt("four");
		releaseCompaction();
		await compactPromise;

		// The new work survives the graft, and the compaction is applied.
		expect(getUserTexts(harness)).toContain("four");
		const assistantTexts = harness.session.messages
			.filter((message) => message.role === "assistant")
			.map((message) => getMessageText(message));
		expect(assistantTexts).toContain("response four");
		const entries = harness.sessionManager.getEntries();
		expect(entries.filter((entry) => entry.type === "compaction")).toHaveLength(1);
		expect(harness.eventsOfType("compaction_end").map((event) => event.reason)).toEqual(["manual"]);
	});

	it("discards the result when the branch changes before the graft", async () => {
		let markCompactionStarted = () => {};
		const compactionStarted = new Promise<void>((resolve) => {
			markCompactionStarted = resolve;
		});
		let releaseCompaction = () => {};
		const compactionReleased = new Promise<void>((resolve) => {
			releaseCompaction = resolve;
		});

		const harness = await createHarness({
			settings: { compaction: { keepRecentTokens: 1 } },
			extensionFactories: [
				(pi) => {
					pi.on("session_before_compact", async (event) => {
						markCompactionStarted();
						await compactionReleased;
						return {
							compaction: {
								summary: "background summary",
								firstKeptEntryId: event.preparation.firstKeptEntryId,
								tokensBefore: event.preparation.tokensBefore,
								details: {},
							},
						};
					});
				},
			],
		});
		harnesses.push(harness);
		harness.setResponses([
			fauxAssistantMessage("response one"),
			fauxAssistantMessage("response two"),
			fauxAssistantMessage("response three"),
		]);

		await harness.session.prompt("one");
		await harness.session.prompt("two");
		await harness.session.prompt("three");

		const compactPromise = harness.session.compact();
		const compactRejection = expect(compactPromise).rejects.toThrow("branch changed");
		await compactionStarted;

		// Move to a different branch (as `/new` or a fork would) before the graft.
		harness.sessionManager.resetLeaf();
		harness.sessionManager.appendMessage(userMsg("new branch"));

		releaseCompaction();
		await compactRejection;

		expect(harness.sessionManager.getEntries().some((entry) => entry.type === "compaction")).toBe(false);
	});
});
