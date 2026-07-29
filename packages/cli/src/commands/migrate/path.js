import path from 'node:path';

/** @param {string} root @param {string} file */
export function displayPath(root, file) {
	const value = path.relative(root, file);
	return value && !value.startsWith('..') ? value : file;
}
