import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const repo = path.resolve(import.meta.dirname, '../..');
const packageRoot = path.join(repo, 'packages/react-resizable-panels');

describe('react-resizable-panels runtime parity evidence', () => {
  test('provenance, identities, classifications, and negative controls are executable', () => {
    execFileSync(process.execPath, [path.join(packageRoot, 'audit/verify-provenance.mjs'), '--negative-controls'], { cwd: repo });
  });

  test('the Octane entry point has the exact pinned runtime export set', () => {
    const expected = JSON.parse(readFileSync(path.join(packageRoot, 'audit/public-api.json'), 'utf8')).runtime.sort();
    const source = readFileSync(path.join(packageRoot, 'src/index.tsrx'), 'utf8');
    const actual = [...source.matchAll(/export\s*\{([^}]+)\}\s*from/g)]
      .flatMap((match) => match[1].split(',').map((name) => name.trim()).filter(Boolean))
      .sort();
    assert.deepEqual(actual, expected);
  });

  test('all upstream and port-authored registrations have a terminal classification', () => {
    const upstream = JSON.parse(readFileSync(path.join(packageRoot, 'audit/test-inventory.json'), 'utf8'));
    const port = JSON.parse(readFileSync(path.join(packageRoot, 'audit/port-test-inventory.json'), 'utf8'));
    assert.equal(upstream.registrationCount, 329);
    assert.equal(port.registrationCount, 15);
    assert.ok(upstream.artifacts.every((artifact) => artifact.disposition === 'adapted'));
    assert.ok(port.artifacts.every((artifact) => artifact.classification === 'port-authored'));
  });
});
