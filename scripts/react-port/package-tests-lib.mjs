import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const PACKAGE_TEST_FILE_PATTERN = /(?:^|[.-])(?:test|spec)\.(?:[cm]?[jt]sx?|tsrx)$/i;
const SKIPPED_DIRECTORIES = new Set(['dist', 'node_modules']);

export function discoverPackageTests(packageDirectory) {
	const packageRoot = path.resolve(packageDirectory);
	if (!existsSync(packageRoot)) return [];
	const files = [];
	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (
				entry.isDirectory() &&
				(SKIPPED_DIRECTORIES.has(entry.name) ||
					(directory === packageRoot && entry.name === 'upstream'))
			) {
				continue;
			}
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) walk(entryPath);
			else if (entry.isFile() && PACKAGE_TEST_FILE_PATTERN.test(entry.name)) {
				files.push(entryPath);
			}
		}
	};
	walk(packageRoot);
	return files.sort();
}

export function hasObservablePackageTests(packageDirectory) {
	return discoverPackageTests(packageDirectory).length > 0;
}
