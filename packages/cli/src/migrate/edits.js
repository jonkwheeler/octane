/**
 * @typedef {{ start: number, end: number, text: string, reason: string }} TextEdit
 */

/** @param {string} source @param {TextEdit[]} edits */
export function applyTextEdits(source, edits) {
	const ordered = [...edits].sort(
		(left, right) => right.start - left.start || right.end - left.end,
	);
	let previousStart = source.length + 1;
	let output = source;
	for (const edit of ordered) {
		if (
			!Number.isInteger(edit.start) ||
			!Number.isInteger(edit.end) ||
			edit.start < 0 ||
			edit.end < edit.start ||
			edit.end > source.length ||
			edit.end > previousStart
		) {
			throw new Error('Migration edit ranges overlap or fall outside the analyzed source.');
		}
		output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
		previousStart = edit.start;
	}
	return output;
}
