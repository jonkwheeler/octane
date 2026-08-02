import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedRuntime = [
  'Group', 'Panel', 'Separator', 'isCoarsePointer', 'useDefaultLayout',
  'useGroupCallbackRef', 'useGroupRef', 'usePanelCallbackRef', 'usePanelRef',
].sort();
const expectedTypes = [
  'GroupImperativeHandle', 'GroupProps', 'Layout', 'LayoutChangedMeta',
  'LayoutStorage', 'OnGroupLayoutChange', 'OnPanelResize', 'Orientation',
  'PanelImperativeHandle', 'PanelProps', 'PanelSize', 'SeparatorProps', 'SizeUnit',
].sort();

function walk(root) {
  return readdirSync(root, { recursive: true })
    .map((path) => join(root, path))
    .filter((path) => statSync(path).isFile())
    .sort();
}

function fail(message) {
  throw new Error(message);
}

function verifyHashes(lines = readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n')) {
  const expected = new Map(lines.map((line) => {
    const match = /^(\w{64})  (.+)$/.exec(line);
    if (!match) fail(`Malformed checksum line: ${line}`);
    return [match[2], match[1]];
  }));
  const actualPaths = [...walk(join(packageRoot, 'upstream/source')), ...walk(join(packageRoot, 'upstream/npm'))]
    .map((path) => relative(packageRoot, path));
  if (actualPaths.length !== expected.size) fail('Vendored file added or removed');
  for (const path of actualPaths) {
    const wanted = expected.get(path);
    if (!wanted) fail(`Unexpected vendored file: ${path}`);
    const actual = createHash('sha256').update(readFileSync(join(packageRoot, path))).digest('hex');
    if (actual !== wanted) fail(`Checksum mismatch: ${path}`);
  }
}

function verifyApi(api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8'))) {
  if (JSON.stringify([...api.runtime].sort()) !== JSON.stringify(expectedRuntime)) fail('Runtime export inventory drift');
  if (JSON.stringify([...api.types].sort()) !== JSON.stringify(expectedTypes)) fail('Public type inventory drift');
  const sourceIndex = readFileSync(join(packageRoot, 'upstream/source/lib/index.ts'), 'utf8');
  for (const name of [...expectedRuntime, ...expectedTypes]) {
    if (!new RegExp(`\\b${name}\\b`).test(sourceIndex)) fail(`Upstream index no longer exports ${name}`);
  }
  const declaration = readFileSync(join(packageRoot, 'upstream/npm/dist/react-resizable-panels.d.ts'), 'utf8');
  for (const name of [...expectedRuntime, ...expectedTypes]) {
    if (!new RegExp(`export declare (?:function|interface|type) ${name}\\b`).test(declaration)) {
      fail(`Published declaration no longer exports ${name}`);
    }
  }
}

function extractTests() {
  const root = join(packageRoot, 'upstream/source/lib');
  return walk(root)
    .filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path))
    .map((path) => {
      const source = readFileSync(path, 'utf8');
      const identities = [...source.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)].map((match) => match[2]);
      return {
        path: relative(root, path),
        registrationCount: identities.length,
        identities,
        disposition: 'pending-adaptation',
      };
    });
}

function verifyTests(inventory = JSON.parse(readFileSync(join(packageRoot, 'audit/test-inventory.json'), 'utf8'))) {
  const actual = extractTests();
  if (JSON.stringify(inventory.artifacts) !== JSON.stringify(actual)) fail('Upstream test identity inventory drift');
  if (inventory.artifactCount !== actual.length) fail('Upstream test artifact count drift');
  const count = actual.reduce((total, artifact) => total + artifact.registrationCount, 0);
  if (inventory.registrationCount !== count) fail('Upstream test registration count drift');
  if (actual.some((artifact) => artifact.disposition !== 'pending-adaptation')) fail('Invalid U1 test disposition');
  const source = actual.map((artifact) => readFileSync(join(packageRoot, 'upstream/source/lib', artifact.path), 'utf8')).join('\n');
  if (/\b(?:it|test|describe)\.(?:skip|todo)\b/.test(source)) fail('Skipped/todo upstream test registration found');
}

function expectFailure(label, callback) {
  try { callback(); } catch { return; }
  fail(`Negative control did not fail: ${label}`);
}

verifyHashes();
verifyApi();
verifyTests();

if (process.argv.includes('--negative-controls')) {
  const checksumLines = readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n');
  expectFailure('deleted vendored identity', () => verifyHashes(checksumLines.slice(1)));
  expectFailure('modified vendored identity', () => verifyHashes([checksumLines[0].replace(/^./, '0'), ...checksumLines.slice(1)]));
  const api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8'));
  expectFailure('missing runtime export', () => verifyApi({ ...api, runtime: api.runtime.slice(1) }));
  expectFailure('extra public type', () => verifyApi({ ...api, types: [...api.types, 'WeakenedType'] }));
  const tests = JSON.parse(readFileSync(join(packageRoot, 'audit/test-inventory.json'), 'utf8'));
  expectFailure('missing test artifact', () => verifyTests({ ...tests, artifacts: tests.artifacts.slice(1) }));
  const renamed = structuredClone(tests);
  renamed.artifacts[0].identities[0] += ' renamed';
  expectFailure('renamed test identity', () => verifyTests(renamed));
}

console.log(`Verified ${readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n').length} vendored files, ${expectedRuntime.length} runtime exports, ${expectedTypes.length} public types, and ${JSON.parse(readFileSync(join(packageRoot, 'audit/test-inventory.json'), 'utf8')).registrationCount} test registrations.`);
