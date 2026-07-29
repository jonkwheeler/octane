/** @param {any} node @param {(node: any) => void} visit */
export function walkAst(node, visit) {
	if (!node || typeof node !== 'object') return;
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === 'loc' || key === 'metadata') continue;
		if (Array.isArray(value)) {
			for (const child of value) walkAst(child, visit);
		} else {
			walkAst(value, visit);
		}
	}
}

/** @param {any} node @returns {import('./findings.js').SourceLocation | null} */
export function sourceLocation(node) {
	return node?.loc?.start ? { line: node.loc.start.line, column: node.loc.start.column + 1 } : null;
}
