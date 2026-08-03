import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { verifyReactDropzoneEvidence } from './react-dropzone-evidence-lib.mjs';

const repository = resolve(import.meta.dirname, '../..');
const fixture = () => {
	const root = mkdtempSync(resolve(tmpdir(), 'react-dropzone-evidence-'));
	cpSync(resolve(repository, 'packages/react-dropzone'), resolve(root, 'packages/react-dropzone'), {
		recursive: true,
	});
	return root;
};

test('react-dropzone evidence accepts the committed exhaustive ledgers', () => {
	assert.equal(verifyReactDropzoneEvidence(repository), true);
});

test('react-dropzone evidence rejects a removed upstream classification', () => {
	const root = fixture();
	const path = resolve(root, 'packages/react-dropzone/audit/test-classifications.json');
	const value = JSON.parse(readFileSync(path, 'utf8'));
	value.upstreamCases.pop();
	writeFileSync(path, JSON.stringify(value));
	assert.throws(() => verifyReactDropzoneEvidence(root), /every upstream runtime identity/);
});

test('react-dropzone evidence rejects a duplicated authored classification', () => {
	const root = fixture();
	const path = resolve(root, 'packages/react-dropzone/audit/test-classifications.json');
	const value = JSON.parse(readFileSync(path, 'utf8'));
	value.portAuthored.push(value.portAuthored[0]);
	writeFileSync(path, JSON.stringify(value));
	assert.throws(() => verifyReactDropzoneEvidence(root), /port-authored runtime test/);
});
