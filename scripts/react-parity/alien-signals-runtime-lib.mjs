/**
 * One-for-one pristine/adapted runtime identity crosswalk for alien-signals.
 */

const DISABLED_REGISTRATION =
	/\b(?:fdescribe|fit|xdescribe|xit|xtest)(?:\s*\(|\.each\s*\()|\b(?:describe|it|test)\.(?:failing|only|skip|todo)(?:\s*\(|\.each\s*\()/;

export function titlesFromInventory(inventory) {
	return (inventory?.tests ?? [])
		.map(function titleOf(test) {
			return test.fullName;
		})
		.sort();
}

export function describeTitleMismatch(pristineTitles, adaptedTitles) {
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

export function assertRuntimeCrosswalk(pristineInventory, adaptedInventory) {
	const pristineTitles = titlesFromInventory(pristineInventory);
	const adaptedTitles = titlesFromInventory(adaptedInventory);
	if (JSON.stringify(pristineTitles) !== JSON.stringify(adaptedTitles)) {
		throw new Error(
			`alien-signals runtime inventories are not one-for-one by title: ${describeTitleMismatch(pristineTitles, adaptedTitles)}`,
		);
	}
	return {
		titles: pristineTitles.length,
	};
}

export function assertAdaptedSourceExecutable(source, label = 'adapted suite') {
	if (DISABLED_REGISTRATION.test(source)) {
		throw new Error(
			`${label}: adapted upstream tests must execute without focused, failing, skip, or todo markers`,
		);
	}
}
