import Dexie from 'dexie';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, describe, it } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const FIXTURE = resolve(__dirname, '../_fixtures/live-query.tsrx');
const CACHE = resolve(__dirname, '.react-cache');

beforeAll(() =>
	execFileSync(process.execPath, [resolve(__dirname, 'compile-runner.mjs'), FIXTURE, CACHE]),
);

async function settleIndexedDb() {
	for (let index = 0; index < 5; index++) await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('differential: @octanejs/dexie vs dexie-react-hooks', () => {
	// @parity-case differential:dexie-live-query
	it('useLiveQuery renders and reacts to IndexedDB writes byte-identically', async () => {
		const db = new Dexie('octane-dexie-differential');
		db.version(1).stores({ items: 'id, group' });
		await db.table('items').add({ id: 1, group: 'a', name: 'Alpha' });
		const differential = await mountDifferential(
			FIXTURE,
			'LiveQueryReader',
			{ db, group: 'a' },
			CACHE,
		);
		await differential.step('initial query', settleIndexedDb);
		await differential.step('affected add', async () => {
			await db.table('items').add({ id: 2, group: 'a', name: 'Gamma' });
			await settleIndexedDb();
		});
		differential.unmount();
		await db.delete();
	});
});
