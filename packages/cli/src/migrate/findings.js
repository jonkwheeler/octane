const SEVERITY_ORDER = { blocker: 0, warning: 1, info: 2 };

/**
 * @typedef {{ line: number, column: number }} SourceLocation
 * @typedef {{
 *   code: string,
 *   severity: 'blocker' | 'warning' | 'info',
 *   message: string,
 *   file: string | null,
 *   location: SourceLocation | null,
 *   specifier: string | null,
 *   evidence: string | null
 * }} MigrationFinding
 */

/**
 * @param {{
 *   code: string,
 *   severity: 'blocker' | 'warning' | 'info',
 *   message: string,
 *   file?: string | null,
 *   location?: SourceLocation | null,
 *   specifier?: string | null,
 *   evidence?: string | null
 * }} input
 * @returns {MigrationFinding}
 */
export function createFinding({
	code,
	severity,
	message,
	file = null,
	location = null,
	specifier = null,
	evidence = null,
}) {
	return { code, severity, message, file, location, specifier, evidence };
}

/** @param {MigrationFinding[]} findings @returns {MigrationFinding[]} */
export function sortFindings(findings) {
	return [...findings].sort(
		(left, right) =>
			SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
			String(left.file).localeCompare(String(right.file)) ||
			(left.location?.line ?? 0) - (right.location?.line ?? 0) ||
			left.code.localeCompare(right.code) ||
			String(left.specifier).localeCompare(String(right.specifier)),
	);
}
