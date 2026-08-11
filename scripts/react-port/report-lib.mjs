import { createHash } from 'node:crypto';

const SENSITIVE_KEY_PATTERN = /(?:authorization|cookie|password|secret|token|api[-_]?key)/i;
const SENSITIVE_VALUE_PATTERN = /\b(?:gh[oprsu]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g;

function sanitizeUrl(value) {
	let url;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	url.username = '';
	url.password = '';
	const parameters = [...url.searchParams.entries()]
		.map(([key, parameterValue]) => [
			key,
			SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : parameterValue,
		])
		.sort(([left], [right]) => left.localeCompare(right));
	url.search = '';
	for (const [key, parameterValue] of parameters) url.searchParams.append(key, parameterValue);
	return url.toString();
}

export function sanitizeForReport(value, key = '') {
	if (SENSITIVE_KEY_PATTERN.test(key)) return '[REDACTED]';
	if (Array.isArray(value)) return value.map((item) => sanitizeForReport(item));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([entryKey, entryValue]) => [
				entryKey,
				sanitizeForReport(entryValue, entryKey),
			]),
		);
	}
	if (typeof value === 'string') {
		const sanitizedUrl = sanitizeUrl(value);
		if (sanitizedUrl) return sanitizedUrl;
		SENSITIVE_VALUE_PATTERN.lastIndex = 0;
		if (SENSITIVE_VALUE_PATTERN.test(value)) {
			SENSITIVE_VALUE_PATTERN.lastIndex = 0;
			return value.replace(SENSITIVE_VALUE_PATTERN, '[REDACTED]');
		}
	}
	return value;
}

export function stableStringify(value) {
	function sort(item) {
		if (Array.isArray(item)) return item.map(sort);
		if (item && typeof item === 'object') {
			return Object.fromEntries(
				Object.keys(item)
					.sort()
					.map((key) => [key, sort(item[key])]),
			);
		}
		return item;
	}
	return JSON.stringify(sort(value));
}

export function fingerprint(value) {
	return createHash('sha256').update(stableStringify(value)).digest('hex');
}
