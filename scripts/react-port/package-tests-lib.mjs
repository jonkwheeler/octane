import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const PACKAGE_TEST_FILE_PATTERN = /(?:^|[.-])(?:test|spec)\.(?:[cm]?[jt]sx?|tsrx)$/i;
const PACKAGE_TEST_SOURCE_PATTERN = /\.(?:[cm]?[jt]sx?|tsrx)$/i;
const TEST_DIRECTORIES = new Set(['__tests__', 'test', 'tests']);
const SKIPPED_DIRECTORIES = new Set(['dist', 'node_modules']);

function isReportEligibleTestFile(packageRoot, filePath) {
	if (PACKAGE_TEST_FILE_PATTERN.test(path.basename(filePath))) return true;
	if (!PACKAGE_TEST_SOURCE_PATTERN.test(filePath)) return false;
	const directories = path.relative(packageRoot, filePath).split(path.sep).slice(0, -1);
	return directories.some((directory) => TEST_DIRECTORIES.has(directory));
}

function discoverMatchingPackageTests(
	packageDirectory,
	{ includeTopLevelUpstream, reportEligible },
) {
	const packageRoot = path.resolve(packageDirectory);
	if (!existsSync(packageRoot)) return [];
	const files = [];
	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (
				entry.isDirectory() &&
				(SKIPPED_DIRECTORIES.has(entry.name) ||
					(!includeTopLevelUpstream && directory === packageRoot && entry.name === 'upstream'))
			) {
				continue;
			}
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) walk(entryPath);
			else if (
				entry.isFile() &&
				(reportEligible
					? isReportEligibleTestFile(packageRoot, entryPath)
					: PACKAGE_TEST_FILE_PATTERN.test(entry.name))
			) {
				files.push(entryPath);
			}
		}
	};
	walk(packageRoot);
	return files.sort();
}

export function discoverPackageTests(packageDirectory) {
	return discoverMatchingPackageTests(packageDirectory, {
		includeTopLevelUpstream: false,
		reportEligible: false,
	});
}

export function discoverReportEligiblePackageTests(packageDirectory) {
	return discoverMatchingPackageTests(packageDirectory, {
		includeTopLevelUpstream: true,
		reportEligible: true,
	});
}

export function hasObservablePackageTests(packageDirectory) {
	return discoverPackageTests(packageDirectory).length > 0;
}
