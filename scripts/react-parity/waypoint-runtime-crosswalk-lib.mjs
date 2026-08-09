import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRISTINE = 'packages/waypoint/audit/pristine-runtime.json';
const ADAPTED = 'packages/waypoint/audit/adapted-runtime.json';

function titleOf(entry, label) {
	const title = entry.fullName ?? entry.title;
	if (typeof title !== 'string' || title.length === 0) {
		throw new Error(`${label} runtime inventory entry is missing fullName/title`);
	}
	return title;
}

function titlesFromInventory(inventory, label) {
	return (inventory.tests ?? []).map(function mapTitle(entry) {
		return titleOf(entry, label);
	});
}

function assertUniqueTitles(titles, label) {
	const seen = new Set();
	for (const title of titles) {
		if (seen.has(title)) throw new Error(`duplicate ${label} title: ${title}`);
		seen.add(title);
	}
}

function describeTitleMismatch(pristineTitles, adaptedTitles) {
	const pristineSet = new Set(pristineTitles);
	const adaptedSet = new Set(adaptedTitles);
	const missing = pristineTitles.filter(function notInAdapted(title) {
		return !adaptedSet.has(title);
	});
	const extra = adaptedTitles.filter(function notInPristine(title) {
		return !pristineSet.has(title);
	});
	const parts = [];
	if (missing.length > 0) parts.push(`missing adapted titles: ${missing.join('; ')}`);
	if (extra.length > 0) parts.push(`extra adapted titles: ${extra.join('; ')}`);
	if (pristineTitles.length !== adaptedTitles.length) {
		parts.push(`count ${adaptedTitles.length} !== pristine ${pristineTitles.length}`);
	}
	return parts.join('; ');
}

/**
 * Require a one-for-one pristine↔adapted node-suite title bijection.
 * Inventories are generated independently; this is the committed crosswalk gate.
 */
export function verifyWaypointNodeCrosswalk(root) {
	const pristinePath = resolve(root, PRISTINE);
	const adaptedPath = resolve(root, ADAPTED);
	if (!existsSync(pristinePath)) throw new Error(`missing node runtime inventory: ${PRISTINE}`);
	if (!existsSync(adaptedPath)) throw new Error(`missing node runtime inventory: ${ADAPTED}`);
	const pristine = JSON.parse(readFileSync(pristinePath, 'utf8'));
	const adapted = JSON.parse(readFileSync(adaptedPath, 'utf8'));
	const pristineTitles = titlesFromInventory(pristine, 'pristine');
	const adaptedTitles = titlesFromInventory(adapted, 'adapted');
	assertUniqueTitles(pristineTitles, 'pristine');
	assertUniqueTitles(adaptedTitles, 'adapted');
	const pristineSorted = [...pristineTitles].sort();
	const adaptedSorted = [...adaptedTitles].sort();
	if (JSON.stringify(pristineSorted) !== JSON.stringify(adaptedSorted)) {
		throw new Error(
			`waypoint node runtime inventories are not one-for-one by title: ${describeTitleMismatch(
				pristineSorted,
				adaptedSorted,
			)}`,
		);
	}
	return { titles: pristineTitles.length };
}
