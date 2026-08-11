function parseStableVersion(value) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
	if (!match) return null;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(leftValue, rightValue) {
	const left = Array.isArray(leftValue) ? leftValue : parseStableVersion(leftValue);
	const right = Array.isArray(rightValue) ? rightValue : parseStableVersion(rightValue);
	if (!left || !right) throw new Error('Only stable semantic versions can be ordered');
	for (let index = 0; index < 3; index += 1) {
		if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
	}
	return 0;
}

function singleRangeInterval(range) {
	if (typeof range !== 'string') return null;
	const value = range.trim();
	if (value === '*' || value.toLowerCase() === 'latest') {
		return { lower: [0, 0, 0], lowerInclusive: true, upper: null, upperInclusive: false };
	}
	const exact = parseStableVersion(value);
	if (exact) return { lower: exact, lowerInclusive: true, upper: exact, upperInclusive: true };
	const partial = /^v?(\d+)(?:\.(\d+))?$/.exec(value);
	if (partial) {
		const major = Number(partial[1]);
		const minor = partial[2] === undefined ? null : Number(partial[2]);
		return minor === null
			? {
					lower: [major, 0, 0],
					lowerInclusive: true,
					upper: [major + 1, 0, 0],
					upperInclusive: false,
				}
			: {
					lower: [major, minor, 0],
					lowerInclusive: true,
					upper: [major, minor + 1, 0],
					upperInclusive: false,
				};
	}
	const simple = /^([~^])\s*(v?\d+(?:\.\d+){0,2})$/.exec(value);
	if (simple) {
		const parts = simple[2].replace(/^v/, '').split('.').map(Number);
		const lower = [parts[0], parts[1] ?? 0, parts[2] ?? 0];
		let upper;
		if (simple[1] === '~') {
			upper = parts.length === 1 ? [lower[0] + 1, 0, 0] : [lower[0], lower[1] + 1, 0];
		} else if (parts.length === 1 || lower[0] > 0) upper = [lower[0] + 1, 0, 0];
		else if (parts.length === 2 || lower[1] > 0) upper = [0, lower[1] + 1, 0];
		else upper = [0, 0, lower[2] + 1];
		return { lower, lowerInclusive: true, upper, upperInclusive: false };
	}
	const wildcard = /^(\d+)(?:\.(\d+))?\.(?:x|\*)$/i.exec(value);
	if (wildcard) {
		const major = Number(wildcard[1]);
		if (wildcard[2] === undefined) {
			return {
				lower: [major, 0, 0],
				lowerInclusive: true,
				upper: [major + 1, 0, 0],
				upperInclusive: false,
			};
		}
		const minor = Number(wildcard[2]);
		return {
			lower: [major, minor, 0],
			lowerInclusive: true,
			upper: [major, minor + 1, 0],
			upperInclusive: false,
		};
	}
	const comparators = [...value.matchAll(/(>=|>|<=|<)\s*(v?\d+\.\d+\.\d+)/g)];
	if (
		comparators.length > 0 &&
		comparators
			.map((match) => match[0])
			.join(' ')
			.replace(/\s+/g, ' ') === value.replace(/\s+/g, ' ')
	) {
		const interval = { lower: [0, 0, 0], lowerInclusive: true, upper: null, upperInclusive: false };
		for (const [, operator, versionText] of comparators) {
			const version = parseStableVersion(versionText);
			if (operator.startsWith('>')) {
				const comparison = compareVersions(version, interval.lower);
				if (comparison > 0) {
					interval.lower = version;
					interval.lowerInclusive = operator === '>=';
				} else if (comparison === 0) {
					interval.lowerInclusive &&= operator === '>=';
				}
			} else if (!interval.upper) {
				interval.upper = version;
				interval.upperInclusive = operator === '<=';
			} else {
				const comparison = compareVersions(version, interval.upper);
				if (comparison < 0) {
					interval.upper = version;
					interval.upperInclusive = operator === '<=';
				} else if (comparison === 0) {
					interval.upperInclusive &&= operator === '<=';
				}
			}
		}
		return interval;
	}
	return null;
}

function rangeIntervals(range) {
	if (typeof range !== 'string') return null;
	const intervals = range.split('||').map((part) => singleRangeInterval(part));
	return intervals.every(Boolean) ? intervals : null;
}

function intervalContains(interval, version) {
	const lowerComparison = compareVersions(version, interval.lower);
	if (lowerComparison < 0 || (lowerComparison === 0 && !interval.lowerInclusive)) return false;
	if (!interval.upper) return true;
	const upperComparison = compareVersions(version, interval.upper);
	return upperComparison < 0 || (upperComparison === 0 && interval.upperInclusive);
}

export function satisfiesRange(version, range) {
	if (version === range) return true;
	const parsedVersion = parseStableVersion(version);
	const intervals = rangeIntervals(range);
	return Boolean(
		parsedVersion &&
		intervals &&
		intervals.some((interval) => intervalContains(interval, parsedVersion)),
	);
}

function intervalsOverlap(left, right) {
	const lower = compareVersions(left.lower, right.lower) >= 0 ? left.lower : right.lower;
	const upperCandidates = [left.upper, right.upper].filter(Boolean);
	if (upperCandidates.length === 0) return true;
	const upper =
		upperCandidates.length === 1 || compareVersions(upperCandidates[0], upperCandidates[1]) <= 0
			? upperCandidates[0]
			: upperCandidates[1];
	const comparison = compareVersions(lower, upper);
	if (comparison < 0) return true;
	if (comparison > 0) return false;
	return intervalContains(left, lower) && intervalContains(right, lower);
}

export function rangesOverlap(leftRange, rightRange) {
	if (leftRange === rightRange) return true;
	const leftIntervals = rangeIntervals(leftRange);
	const rightIntervals = rangeIntervals(rightRange);
	if (!leftIntervals || !rightIntervals) return false;
	return leftIntervals.some((left) =>
		rightIntervals.some((right) => intervalsOverlap(left, right)),
	);
}

export function selectHighestSatisfyingVersion(versions, range) {
	if (versions.includes(range)) return range;
	const candidates = versions.filter((version) => satisfiesRange(version, range));
	if (candidates.length === 0) return null;
	return candidates.sort((left, right) => compareVersions(right, left))[0];
}
