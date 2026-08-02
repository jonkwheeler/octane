import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function verifyTypeParity(ledger, pristine, adapted) {
	for (const id of ledger.assertions) {
		const marker = `// @type-parity ${id}`;
		if (!pristine.includes(marker) || !adapted.includes(marker)) {
			throw new Error(`missing type parity assertion ${id}`);
		}
	}
	for (const [label, source] of [
		['pristine', pristine],
		['adapted', adapted],
	]) {
		const negativeMarkers = [...source.matchAll(/^\/\/ @type-parity negative:/gm)].length;
		const expectedErrors = [...source.matchAll(/^\/\/ @ts-expect-error /gm)].length;
		if (negativeMarkers !== expectedErrors) {
			throw new Error(`${label} negative assertions lost an @ts-expect-error`);
		}
	}
}

export async function verifyCommittedTypeParity() {
	const ledger = JSON.parse(
		await readFile(resolve(root, 'packages/embla-carousel/audit/type-parity.json')),
	);
	const [pristine, adapted] = await Promise.all([
		readFile(resolve(root, ledger.pristine), 'utf8'),
		readFile(resolve(root, ledger.adapted), 'utf8'),
	]);
	verifyTypeParity(ledger, pristine, adapted);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await verifyCommittedTypeParity();
