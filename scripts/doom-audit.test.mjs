import assert from 'node:assert/strict';
import test from 'node:test';

import { validateDoomAudit } from './doom-audit.mjs';

const complete = {
	provenance: {
		repository: 'https://github.com/eugeniosegala/doom-react-three-fiber',
		commit: 'b48daeb3f91b8d8175a1d59d6a9c0c6c3b47caa0',
		license: 'NOASSERTION',
		vendored: false,
	},
	attestations: {
		oracleResearcher: 'isolated-agent-context',
		migrationImplementer: 'clean-room-context',
		reviewer: 'octane-maintainer',
	},
	behaviors: [
		{
			id: 'route-landing',
			required: true,
			observation: 'The root route presents a landing state.',
			evidence: [{ kind: 'browser', target: 'doom landing route' }],
		},
	],
	constructs: [
		{
			id: 'react-composition',
			family: 'React',
			classification: 'mechanically-transformed',
			evidence: 'Octane TSRX components and hooks',
		},
	],
	assets: [
		{
			id: 'procedural-visuals',
			path: 'playground/octane/src/demos/doom/assets.ts',
			kind: 'source-authored',
			license: 'MIT',
			creator: 'Octane contributors',
			role: 'All game visuals and synthesized audio',
		},
	],
};

test('accepts an exhaustive clean-room audit', () => {
	assert.doesNotThrow(() => validateDoomAudit(complete));
});

test('rejects missing mappings and duplicate identities', () => {
	assert.throws(() => validateDoomAudit({ ...complete, behaviors: [] }), /at least one behavior/);
	assert.throws(
		() =>
			validateDoomAudit({ ...complete, behaviors: [...complete.behaviors, complete.behaviors[0]] }),
		/duplicate behavior id/,
	);
});

test('rejects required behavior without executable or enumerated manual evidence', () => {
	const behavior = { ...complete.behaviors[0], evidence: [] };
	assert.throws(
		() => validateDoomAudit({ ...complete, behaviors: [behavior] }),
		/required behavior route-landing has no evidence/,
	);
});

test('rejects unclassified constructs and unlicensed assets', () => {
	assert.throws(
		() =>
			validateDoomAudit({
				...complete,
				constructs: [{ ...complete.constructs[0], classification: '' }],
			}),
		/construct react-composition has invalid classification/,
	);
	assert.throws(
		() =>
			validateDoomAudit({
				...complete,
				assets: [{ ...complete.assets[0], license: 'NOASSERTION' }],
			}),
		/asset procedural-visuals lacks redistribution permission/,
	);
});
