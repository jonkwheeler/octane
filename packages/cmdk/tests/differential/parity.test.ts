/**
 * The same fixture runs through @octanejs/cmdk and published cmdk@1.1.1.
 * Every `step` compares normalized innerHTML after driving identical events;
 * `observe` is used only where the port documents an intentional divergence.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { act } from 'react';
import { mountDifferential, normaliseHtml } from '../../../octane/tests/differential/_rig.js';

const FIXTURE = resolve(__dirname, '../_fixtures/cmdk-diff.tsrx');
const CACHE = resolve(__dirname, '.react-cache');

// Upstream cmdk's List constructs a ResizeObserver unguarded, which throws in
// jsdom. Install an inert one for BOTH runtimes so neither side writes
// `--cmdk-list-height` and the comparison stays about cmdk's own behaviour.
class InertResizeObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

const globals = globalThis as unknown as Record<string, unknown>;
let realResizeObserver: unknown;
let addedScrollIntoView = false;

beforeAll(function () {
	realResizeObserver = globals.ResizeObserver;
	globals.ResizeObserver = InertResizeObserver;

	// jsdom implements no scrollIntoView. Upstream cmdk calls it unguarded (the
	// port guards it), so shim it for BOTH runtimes to keep the comparison about
	// cmdk's behaviour rather than the environment.
	if (typeof Element.prototype.scrollIntoView !== 'function') {
		Element.prototype.scrollIntoView = function scrollIntoView(): void {};
		addedScrollIntoView = true;
	}
});

afterAll(function () {
	globals.ResizeObserver = realResizeObserver;
	if (addedScrollIntoView) {
		delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
	}
});

async function settle(): Promise<void> {
	await act(async function () {
		await new Promise(function resolvePromise(resolveTimeout) {
			setTimeout(resolveTimeout, 20);
		});
	});
}

function selectedText(mount: { find(selector: string): Element }): string | null {
	return mount.find('[cmdk-item][aria-selected="true"]').textContent;
}

function activeDescendant(mount: { find(selector: string): Element }): string | null {
	return mount.find('[cmdk-input]').getAttribute('aria-activedescendant');
}

function itemTexts(mount: { findAll(selector: string): Element[] }): Array<string | null> {
	return mount.findAll('[cmdk-item]').map(function textOf(el) {
		return el.textContent;
	});
}

/**
 * Ranked order as the user sees it. Octane assigns CSS `order` inside a flex
 * container, so DOM order stays source order; upstream relocates nodes, so DOM
 * order is the ranked order. Sorting by `order` (defaulting missing to 0) then
 * source index recovers the visible sequence for both.
 */
function inVisualOrder<T extends Element>(elements: T[]): T[] {
	return elements
		.map(function withOrder(el, index) {
			return {
				el,
				index,
				order: Number((el as unknown as HTMLElement).style.order) || 0,
			};
		})
		.sort(function byOrderThenIndex(a, b) {
			return a.order - b.order || a.index - b.index;
		})
		.map(function onlyElement(entry) {
			return entry.el;
		});
}

function visibleItemTexts(mount: { findAll(selector: string): Element[] }): Array<string | null> {
	return inVisualOrder(mount.findAll('[cmdk-item]')).map(function textOf(el) {
		return el.textContent;
	});
}

function visibleGroupHeadings(mount: {
	findAll(selector: string): Element[];
}): Array<string | null | undefined> {
	return inVisualOrder(mount.findAll('[cmdk-group]')).map(function headingOf(group) {
		return group.querySelector('[cmdk-group-heading]')?.textContent;
	});
}

/**
 * Byte-compare both trees ignoring `aria-activedescendant` only. cmdk re-selects
 * the first match from inside its own layout-effect flush; upstream's batcher
 * drops that nested work so the attribute never lands, while the port's keeps it
 * (see the documented divergence below). Everything else must still match
 * exactly — this is the full rig normalisation, minus that one attribute.
 */
/**
 * OCTANE DIVERGENCE[runtime-adaptation-divergences][differential:cmdk-filter-selection-empty]
 * Upstream ranks matches by physically relocating item nodes;
 * the port assigns CSS `order` inside a flex container instead, because moving a
 * node carries it out of the comment-fenced ranges octane tracks and orphans it
 * (see `sort()` in command.tsrx). The rendered result is the same list in the
 * same visible order, but the port's markup carries the ranking declarations and
 * upstream's does not.
 *
 * Only those exact declarations are removed — any other inline style, and every
 * other attribute and node, still has to match byte-for-byte.
 */
function stripRankingStyles(html: string): string {
	return html
		.replace(/(?:order:\s*\d+|display:\s*flex|flex-direction:\s*column);?\s*/g, '')
		.replace(/ style="\s*"/g, '');
}

function expectEqualIgnoringActiveDescendant(
	octane: { container: HTMLElement },
	react: { container: HTMLElement },
): void {
	function strip(html: string): string {
		return stripRankingStyles(html.replace(/ aria-activedescendant="[^"]*"/g, ''));
	}
	expect(normaliseHtml(strip(octane.container.innerHTML))).toBe(
		normaliseHtml(strip(react.container.innerHTML)),
	);
}

describe('differential: @octanejs/cmdk vs cmdk@1.1.1', function () {
	// @parity-case differential:cmdk-filter-selection-empty
	it('matches filtering, keyboard selection and the empty state', async function () {
		const differential = await mountDifferential(FIXTURE, 'CmdkDiff', undefined, CACHE);

		// OCTANE DIVERGENCE[runtime-adaptation-divergences][differential:cmdk-filter-selection-empty]
		// Initial auto-select only: cmdk computes
		// `selectedItemId` from a callback queued INSIDE its own layout-effect
		// flush. Upstream's batcher clears the queue *after* running it, so that
		// nested entry is dropped and `aria-activedescendant` never lands on the
		// first selection. The port's batcher snapshots-and-clears first (required
		// for correctness on octane), so the combobox is wired from the start.
		// Both agree on WHICH item is selected; only the aria wiring differs, and
		// the runtimes converge as soon as a selection is user-driven.
		await differential.observe('initial render (auto-select)', async function (octane, react) {
			await settle();
			expect(selectedText(octane)).toBe('Salad');
			expect(selectedText(react)).toBe('Salad');
			expect(activeDescendant(octane)).toBe(octane.find('[cmdk-item][aria-selected="true"]').id);
			expect(activeDescendant(react)).toBeNull();
		});

		// From here every selection is user-driven, so the runtimes agree byte-for-byte.
		await differential.step('arrow down moves the selection', async function (octane, react) {
			await octane.keydown('[cmdk-root]', 'ArrowDown');
			await react.keydown('[cmdk-root]', 'ArrowDown');
			await settle();
		});

		await differential.step('arrow up moves it back', async function (octane, react) {
			await octane.keydown('[cmdk-root]', 'ArrowUp');
			await react.keydown('[cmdk-root]', 'ArrowUp');
			await settle();
		});

		// Ranking: "a" leaves Salad/Apple/Banana with different scores
		// (Apple≈0.9899, Banana=0.17, Salad=0.1683). Score order is
		// Apple > Banana > Salad, which disagrees with source order — so removing
		// Octane's CSS ranking (or upstream's DOM relocate) would fail these asserts.
		// DOM order itself is the recorded divergence, so this checkpoint does not
		// byte-compare markup.
		await differential.observe('type to rank multiple matches', async function (octane, react) {
			await octane.input('[cmdk-input]', 'a');
			await react.input('[cmdk-input]', 'a');
			await settle();

			expect(selectedText(octane)).toBe('Apple');
			expect(selectedText(react)).toBe('Apple');
			// Filter re-selects from inside the flush: Octane wires the new item;
			// upstream leaves the attribute unset or pointing at a stale id.
			expect(activeDescendant(octane)).toBe(octane.find('[cmdk-item][aria-selected="true"]').id);
			expect(activeDescendant(react)).not.toBe(react.find('[cmdk-item][aria-selected="true"]').id);

			// Upstream relocates nodes, so DOM order is ranked order.
			expect(itemTexts(react)).toEqual(['Apple', 'Banana', 'Salad']);
			// Octane keeps source DOM order and expresses rank as CSS `order`.
			expect(itemTexts(octane)).toEqual(['Salad', 'Apple', 'Banana']);
			expect(visibleItemTexts(octane)).toEqual(['Apple', 'Banana', 'Salad']);
			expect(visibleItemTexts(react)).toEqual(['Apple', 'Banana', 'Salad']);
		});

		// Single-match filter: same aria contract, then byte-compare with the
		// attribute stripped (DOM order agrees when only one item survives).
		await differential.observe('type to filter', async function (octane, react) {
			await octane.input('[cmdk-input]', 'ban');
			await react.input('[cmdk-input]', 'ban');
			await settle();
			expect(selectedText(octane)).toBe('Banana');
			expect(selectedText(react)).toBe('Banana');
			expect(activeDescendant(octane)).toBe(octane.find('[cmdk-item][aria-selected="true"]').id);
			expect(activeDescendant(react)).not.toBe(react.find('[cmdk-item][aria-selected="true"]').id);
			expectEqualIgnoringActiveDescendant(octane, react);
		});

		await differential.observe('no matches renders Empty', async function (octane, react) {
			await octane.input('[cmdk-input]', 'zzzz');
			await react.input('[cmdk-input]', 'zzzz');
			await settle();
			expect(octane.findAll('[cmdk-item]')).toHaveLength(0);
			expect(octane.find('[cmdk-empty]').textContent).toBe('No results found.');
			expect(activeDescendant(octane)).toBeNull();
			expect(activeDescendant(react)).toBeNull();
			expectEqualIgnoringActiveDescendant(octane, react);
		});

		await differential.observe('clearing restores every item', async function (octane, react) {
			await octane.input('[cmdk-input]', '');
			await react.input('[cmdk-input]', '');
			await settle();
			// Both restore every item, in SOURCE order. This checkpoint used to pin a
			// divergence: upstream's sort() relocates matching nodes, React's
			// reconciler puts them back when the search clears, and octane's leaves
			// externally-moved nodes where they are — so the port's list stayed
			// scrambled. The port no longer moves nodes at all (it ranks with CSS
			// `order` and drops that on clear), so the residue cannot form and the
			// two runtimes agree exactly.
			expect(itemTexts(react)).toEqual(['Salad', 'Apple', 'Banana', 'Cherry']);
			expect(itemTexts(octane)).toEqual(['Salad', 'Apple', 'Banana', 'Cherry']);
			expect(selectedText(octane)).toBe('Salad');
			expect(selectedText(react)).toBe('Salad');
			// Clear re-selects from inside the flush again: only Octane wires aria.
			expect(activeDescendant(octane)).toBe(octane.find('[cmdk-item][aria-selected="true"]').id);
			expect(activeDescendant(react)).not.toBe(react.find('[cmdk-item][aria-selected="true"]').id);
			expectEqualIgnoringActiveDescendant(octane, react);
		});

		differential.unmount();
	});

	// @parity-case differential:cmdk-groups
	it('matches grouped rendering, and documents the group-ordering divergence', async function () {
		const differential = await mountDifferential(FIXTURE, 'CmdkDiffGroups', undefined, CACHE);

		await differential.observe('initial grouped render', async function (octane, react) {
			await settle();
			const headings = function headingsOf(mount: typeof octane) {
				return mount.findAll('[cmdk-group-heading]').map(function textOf(el) {
					return el.textContent;
				});
			};
			const groupValues = function groupValuesOf(mount: typeof octane) {
				return mount.findAll('[cmdk-group]').map(function valueOf(el) {
					return el.getAttribute('data-value');
				});
			};

			// Both register a value for every group, from the heading text.
			expect(headings(octane)).toEqual(['Fruits', 'Vegetables']);
			expect(headings(react)).toEqual(['Fruits', 'Vegetables']);
			expect(groupValues(octane)).toEqual(['Fruits', 'Vegetables']);
			expect(groupValues(react)).toEqual(['Fruits', 'Vegetables']);
		});

		// Empty-group hide is shared behaviour; keep it before the ordering pin.
		await differential.observe('filter to one group', async function (octane, react) {
			await octane.input('[cmdk-input]', 'car');
			await react.input('[cmdk-input]', 'car');
			await settle();

			expect(itemTexts(octane)).toEqual(['Carrot']);
			expect(itemTexts(react)).toEqual(['Carrot']);

			const hidden = function hiddenGroups(mount: typeof octane) {
				return mount
					.findAll('[cmdk-group]')
					.filter(function isHidden(el) {
						return el.hasAttribute('hidden');
					})
					.map(function valueOf(el) {
						return el.getAttribute('data-value');
					});
			};
			expect(hidden(octane)).toEqual(['Fruits']);
			expect(hidden(react)).toEqual(['Fruits']);
		});

		// OCTANE DIVERGENCE[corrected-group-ordering][differential:cmdk-groups]
		// Upstream resolves the group element by
		// `[data-value="<groupId>"]`, but `data-value` holds the heading text — so
		// its group reorder can never match and is dead code. The port matches on
		// the registered value, so groups reorder by best item score. "p" leaves
		// both groups visible (Apple + Potato) while Potato outranks Apple, so the
		// later source group must paint first on Octane and stay second on React.
		await differential.observe(
			'filter ranks groups by best item score',
			async function (octane, react) {
				await octane.input('[cmdk-input]', 'p');
				await react.input('[cmdk-input]', 'p');
				await settle();

				expect([...itemTexts(octane)].sort()).toEqual(['Apple', 'Potato']);
				expect([...itemTexts(react)].sort()).toEqual(['Apple', 'Potato']);

				// React: source order — Fruits before Vegetables (dead reorder).
				expect(visibleGroupHeadings(react)).toEqual(['Fruits', 'Vegetables']);
				// Octane: Vegetables (Potato) outranks Fruits (Apple).
				expect(visibleGroupHeadings(octane)).toEqual(['Vegetables', 'Fruits']);
			},
		);

		differential.unmount();
	});

	// @parity-case differential:cmdk-force-mount-empty
	it('documents Empty suppression while a force-mounted item is visible', async function () {
		const differential = await mountDifferential(FIXTURE, 'CmdkDiffForceMount', undefined, CACHE);

		// OCTANE DIVERGENCE[force-mount-empty-count][differential:cmdk-force-mount-empty]
		await differential.observe(
			'forceMount keeps Empty suppressed on a non-matching search',
			async function (octane, react) {
				await octane.input('[cmdk-input]', 'zzzzzz');
				await react.input('[cmdk-input]', 'zzzzzz');
				await settle();

				expect(itemTexts(octane)).toEqual(['Always Here']);
				expect(itemTexts(react)).toEqual(['Always Here']);
				expect(octane.container.querySelector('[cmdk-empty]')).toBeNull();
				// Upstream skips forceMount registration, so Empty can render over it.
				expect(react.container.querySelector('[cmdk-empty]')).not.toBeNull();
			},
		);

		differential.unmount();
	});

	// @parity-case differential:cmdk-force-mount-rank
	it('documents force-mounted non-match ranking below scored matches', async function () {
		const differential = await mountDifferential(
			FIXTURE,
			'CmdkDiffForceMountRank',
			undefined,
			CACHE,
		);

		// OCTANE DIVERGENCE[force-mount-rank-order][differential:cmdk-force-mount-rank]
		await differential.observe(
			'forceMount non-match stays below ranked matches',
			async function (octane, react) {
				await octane.input('[cmdk-input]', 'ap');
				await react.input('[cmdk-input]', 'ap');
				await settle();

				// Octane assigns CSS order to every valid item so a zero-scoring
				// forceMount stays below matches. Upstream's published sort leaves
				// the forceMount first in DOM order for this fixture.
				expect(visibleItemTexts(octane)).toEqual(['Apple', 'Apricot', 'Always Here']);
				expect(itemTexts(react)).toEqual(['Always Here', 'Apple', 'Apricot']);
			},
		);

		differential.unmount();
	});

	// @parity-case differential:cmdk-registration-teardown
	it('documents forceMount registration release across remounts', async function () {
		const warn = vi.spyOn(console, 'warn').mockImplementation(function noop() {});
		const differential = await mountDifferential(
			FIXTURE,
			'CmdkDiffForceMountSwap',
			undefined,
			CACHE,
		);

		// OCTANE DIVERGENCE[registration-teardown-release][differential:cmdk-registration-teardown]
		// Swap forceMount ↔ plain on ONE live Command so release (or the lack of
		// it) is observable. Fresh mount/unmount trees cannot leak across stores.
		await differential.observe(
			'live forceMount/plain swap keeps a single Apple without duplicate warnings',
			async function (octane, react) {
				expect(itemTexts(octane)).toEqual(['Apple']);
				expect(itemTexts(react)).toEqual(['Apple']);

				await octane.click('#swap');
				await react.click('#swap');
				await settle();
				expect(itemTexts(octane)).toEqual(['Apple']);
				expect(itemTexts(react)).toEqual(['Apple']);

				await octane.click('#swap');
				await react.click('#swap');
				await settle();
				expect(itemTexts(octane)).toEqual(['Apple']);
				expect(itemTexts(react)).toEqual(['Apple']);

				const messages = warn.mock.calls.map(function toMessage(call) {
					return String(call[0]);
				});
				expect(
					messages.filter(function isDuplicate(message) {
						return message.includes('share the value');
					}),
				).toEqual([]);
			},
		);

		warn.mockRestore();
		differential.unmount();
	});
});
