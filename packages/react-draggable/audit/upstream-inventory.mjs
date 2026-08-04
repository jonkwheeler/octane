import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {basename, dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = join(packageRoot, 'audit/upstream-inventory.json');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function filesUnder(root) {
  const result = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else result.push(relative(root, path).replaceAll('\\', '/'));
    }
  }
  await visit(root);
  return result.sort();
}

function staticCalls(source, callees) {
  const pattern = new RegExp(`\\b(?:${callees.join('|')})\\s*\\(\\s*(['\"\\x60])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`, 'g');
  return [...source.matchAll(pattern)].map((match) => ({
    line: source.slice(0, match.index).split(/\r?\n/).length,
    name: match[2].replace(/\\(['\"`\\])/g, '$1'),
  }));
}

function expectTypeAssertions(source) {
  return source.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim();
    return trimmed.startsWith('expectType<')
      ? [{id: `test/typeCompat/fixture.tsx:${index + 1}`, statement: trimmed}]
      : [];
  });
}

function parityMarkers(source, path) {
  return [...source.matchAll(/@parity-case\s+([^\s*]+)/g)].map((match) => ({
    id: match[1],
    path,
  }));
}

const draggableCoverage = [
  ['adapted:draggable-rendering', /defaults|render|preserve child|apply transform|defaultClassName|no children|multiple children/],
  ['adapted:draggable-uncontrolled-axis-classes', /dragging class|dragged class|custom class names|defaultPosition|axis="none"|call onStart|not drag when disabled/],
  ['adapted:draggable-controlled-position', /controlled position|position prop changes|revert to controlled/],
  ['adapted:draggable-offset-handlers', /positionOffset/],
  ['adapted:draggable-svg', /SVG/],
  ['adapted:core-cancel-start', /cancel drag when onStart/],
];

const coreCoverage = [
  ['adapted:core-callback-data', /render its child|call onStart|call onDrag during|call onStop|correct data/],
  ['adapted:core-child-contract', /single child|nodeRef|forwardRef|mounted state|no children/],
  ['adapted:core-any-click-disabled', /disabled|left click|any click|onMouseDown/],
  ['adapted:core-cancel-start', /cancel drag when onStart|user-select|selection class|enableUserSelectHack|continue drag if onStart/],
  ['adapted:core-cancel-drag', /stop drag when onDrag/],
  ['adapted:core-handle-cancel', /handle|cancel elements/],
  ['adapted:core-live-props', /grid|scale/],
  ['adapted:core-touch-lifecycle', /touch|nonce|allowMobileScroll/],
];

function mappedComponentCase(entry) {
  const rules = entry.file.endsWith('/Draggable.test.jsx') ? draggableCoverage : coreCoverage;
  const match = rules.find(([, pattern]) => pattern.test(entry.name));
  assert(match, `${entry.id}: missing explicit adapted case mapping`);
  return [match[0]];
}

async function buildInventory(root = packageRoot) {
  const upstreamRoot = join(root, 'upstream');
  const artifactFiles = await filesUnder(upstreamRoot);
  const artifacts = [];
  for (const path of artifactFiles) {
    const bytes = await readFile(join(upstreamRoot, path));
    artifacts.push({path, bytes: bytes.length, sha256: sha256(bytes)});
  }

  const unitFiles = artifactFiles.filter((path) =>
    path.startsWith('tag/test/') &&
    !path.startsWith('tag/test/browser/') &&
    /\.test\.(?:js|jsx|ts|tsx)$/.test(path),
  );
  const unitCases = [];
  for (const path of unitFiles) {
    const source = await readFile(join(upstreamRoot, path), 'utf8');
    for (const {line, name} of staticCalls(source, ['it', 'test'])) unitCases.push({id: `${path}:${line}::${name}`, file: path, line, name});
  }
  const browserPath = 'tag/test/browser/browser.test.js';
  const browserSource = await readFile(join(upstreamRoot, browserPath), 'utf8');
  const browserCases = staticCalls(browserSource, ['it', 'test']).map(({line, name}) => ({
    id: `${browserPath}:${line}::${name}`, file: browserPath, line, name,
  }));
  const typeSource = await readFile(join(upstreamRoot, 'tag/test/typeCompat/fixture.tsx'), 'utf8');

  const markerPaths = [
    'tests/runtime/draggable.test.ts',
    'tests/runtime/core.test.ts',
    'tests/differential/parity.test.ts',
    'tests/hydration/hydration.test.ts',
    'tests/ssr/server.test.ts',
    'tests/browser/parity.browser.test.ts',
  ];
  const adaptedCases = [];
  for (const path of markerPaths) {
    const source = await readFile(join(root, path), 'utf8');
    adaptedCases.push(...parityMarkers(source, path));
  }
  const exactUtilityFiles = unitFiles.filter((path) => path.includes('/utils/'));
  for (const upstreamPath of exactUtilityFiles) {
    const path = `tests/upstream/exact/${basename(upstreamPath).replace(/\.js$/, '.ts')}`;
    const source = await readFile(join(root, path), 'utf8');
    const upstreamCases = unitCases.filter((entry) => entry.file === upstreamPath);
    const copiedCases = staticCalls(source, ['it', 'test']);
    assert(copiedCases.length === upstreamCases.length, `${path}: adapted case count changed`);
    copiedCases.forEach((entry, index) => {
      assert(entry.name === upstreamCases[index].name, `${path}: adapted case order/name changed at ${index}`);
      adaptedCases.push({
        id: `adapted-upstream:${upstreamCases[index].id}`,
        path,
        name: entry.name,
        line: entry.line,
      });
    });
  }
  adaptedCases.push(
    {id: 'type-program:public-api', path: 'typetests/public-api.test.ts'},
    {id: 'type-program:pristine', path: 'typetests/tsconfig.pristine.json'},
    {id: 'type-program:adapted', path: 'typetests/tsconfig.adapted.json'},
  );
  const adaptedById = new Map(adaptedCases.map((entry) => [entry.id, entry]));
  assert(adaptedById.size === adaptedCases.length, 'adapted parity case identifiers must be unique');

  const sourceFiles = artifactFiles.filter((path) => path.startsWith('tag/lib/'));
  const runtimeExports = ['default', 'DraggableCore'];
  const typeExports = [
    'ControlPosition', 'DraggableBounds', 'DraggableCoreProps', 'DraggableData',
    'DraggableEvent', 'DraggableEventHandler', 'DraggableProps', 'PositionOffsetControlPosition',
  ];
  const fixtures = artifactFiles.filter((path) =>
    path.startsWith('tag/test/') && !/\.test\.(?:js|jsx|ts|tsx)$/.test(path),
  );

  const sourceEvidence = (path) => {
    if (path === 'tag/lib/Draggable.tsx') return ['src/Draggable.tsrx', 'tests/runtime/draggable.test.ts'];
    if (path === 'tag/lib/DraggableCore.tsx') return ['src/DraggableCore.tsrx', 'tests/runtime/core.test.ts'];
    if (path === 'tag/lib/cjs.ts' || path === 'tag/lib/umd.ts') return ['src/index.tsrx', 'tests/runtime/draggable.test.ts'];
    if (path === 'tag/lib/utils/types.ts') return ['src/types.ts', 'typetests/public-api.test.ts'];
    return [path.replace('tag/lib/', 'src/'), path.includes('positionFns') || path.includes('domFns')
      ? 'tests/upstream/dom-position.test.ts'
      : 'tests/upstream/utils.test.ts'];
  };
  const unitCoverage = (entry) => {
    if (entry.file.includes('/utils/')) return [`adapted-upstream:${entry.id}`];
    if (entry.file === 'tag/test/typeCompat.test.ts') return ['type-program:public-api'];
    return mappedComponentCase(entry);
  };
  const evidenceFor = (caseIds) => [...new Set(caseIds.map((id) => {
    const matched = adaptedById.get(id);
    assert(matched, `unknown adapted parity case ${id}`);
    return matched.path;
  }))];
  const adapted = (entry, kind, evidence, note = 'Adapted to the Octane public/runtime contract.', adaptedCases) => ({
    upstream: entry,
    kind,
    disposition: 'adapted-and-executable',
    evidence,
    ...(adaptedCases ? {adaptedCases} : {}),
    note,
  });
  return {
    schemaVersion: 1,
    release: {
      package: 'react-draggable', version: '4.7.1', tag: 'v4.7.1',
      npmIntegrity: 'sha512-wa3tzfFnYt3yaZLuyU58fl1TNunfWfBekDgWhZA1+gb2jnp42wZ0ymuopR6M5kqDYmm4hKmzGlcKWjZf3Zb6RQ==',
      npmShasum: 'e502c3cfe0cc97d691e12aaa377a975fce097d71',
      tagObject: 'cec7498ff84e91215987636d3edbb6ca132ee9e5',
      commit: 'bcbaa8eb285aea49865ca8870c0b7b441c2fe6a4',
      tree: '7b17a5d02449287945f87dee0cecdadcfb56cdc5', license: 'MIT',
    },
    publicSurface: {runtimeExports, typeExports, subpaths: ['.', './package.json']},
    artifacts,
    inventories: {sourceFiles, unitFiles, unitCases, browserCases, fixtures, typeAssertions: expectTypeAssertions(typeSource), adaptedCases},
    crosswalk: {
      source: sourceFiles.map((value) => adapted(value, 'source', sourceEvidence(value), 'Ported source with executable contract coverage.')),
      runtimeExports: runtimeExports.map((value) => adapted(value, 'runtime-export', ['src/index.tsrx', 'tests/runtime/draggable.test.ts'])),
      typeExports: typeExports.map((value) => adapted(value, 'type-export', ['src/index.tsrx', 'typetests/public-api.test.ts'])),
      unitCases: unitCases.map((value) => {
        const caseIds = unitCoverage(value);
        return adapted(value.id, 'unit-case', evidenceFor(caseIds), 'Mapped explicitly to an executable adapted case identity.', caseIds);
      }),
      browserCases: browserCases.map((value) => {
        const suffix = /iframe|unmount|defocus|steal focus/.test(value.name) ? 'ownership-cleanup' : 'native';
        const caseIds = [`browser:react-draggable-chromium-${suffix}`, `browser:react-draggable-firefox-${suffix}`];
        return adapted(value.id, 'browser-case', evidenceFor(caseIds), 'Mapped explicitly to equivalent Chromium and Firefox native-browser scenarios.', caseIds);
      }),
      fixtures: fixtures.map((value) => adapted(value, 'fixture', ['tests/browser/parity.browser.test.ts'], 'Replaced by deterministic Octane real-browser fixtures.')),
      typeAssertions: expectTypeAssertions(typeSource).map((value) => adapted(value.id, 'type-assertion', ['typetests/public-api.test.ts', 'typetests/tsconfig.pristine.json', 'typetests/tsconfig.adapted.json'], 'Checked by both pristine-upstream and adapted public-contract type programs.', ['type-program:public-api', 'type-program:pristine', 'type-program:adapted'])),
      authoredTests: [{
        upstream: 'octane-only:upstream-inventory-negative-controls',
        kind: 'octane-only-test',
        disposition: 'octane-only-framework-contract',
        evidence: ['tests/audit/upstream-inventory.test.mjs'],
        path: 'tests/audit/upstream-inventory.test.mjs',
        classification: 'octane-only-framework-contract',
        reason: 'Negative controls prove that the provenance and crosswalk machinery fails closed; upstream has no equivalent self-audit.',
      }],
    },
    allowedTransforms: [],
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameIdentities(actual, expected, label, getId = (value) => value) {
  const actualIds = actual.map(getId);
  const expectedIds = expected.map(getId);
  const duplicates = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);
  assert(duplicates.length === 0, `${label}: duplicate identity ${duplicates[0]}`);
  for (const id of expectedIds) assert(actualIds.includes(id), `${label}: missing identity ${id}`);
  for (const id of actualIds) assert(expectedIds.includes(id), `${label}: unapproved identity ${id}`);
}

export async function validate(root = packageRoot) {
  const expected = JSON.parse(await readFile(join(root, 'audit/upstream-inventory.json'), 'utf8'));
  const actual = await buildInventory(root);
  assert(JSON.stringify(actual.release) === JSON.stringify(expected.release), 'immutable release coordinates changed');
  sameIdentities(actual.artifacts, expected.artifacts, 'artifact', (value) => value.path);
  for (const artifact of expected.artifacts) {
    const current = actual.artifacts.find((value) => value.path === artifact.path);
    assert(current.sha256 === artifact.sha256, `artifact: stale hash ${artifact.path}`);
    assert(current.bytes === artifact.bytes, `artifact: byte length changed ${artifact.path}`);
  }
  sameIdentities(actual.publicSurface.runtimeExports, expected.publicSurface.runtimeExports, 'runtime export');
  sameIdentities(actual.publicSurface.typeExports, expected.publicSurface.typeExports, 'type export');
  sameIdentities(actual.publicSurface.subpaths, expected.publicSurface.subpaths, 'package subpath');
  sameIdentities(actual.inventories.unitCases, expected.inventories.unitCases, 'unit case', (value) => value.id);
  sameIdentities(actual.inventories.browserCases, expected.inventories.browserCases, 'browser case', (value) => value.id);
  sameIdentities(actual.inventories.typeAssertions, expected.inventories.typeAssertions, 'type assertion', (value) => value.id);
  sameIdentities(actual.inventories.adaptedCases, expected.inventories.adaptedCases, 'adapted case', (value) => value.id);

  for (const [ledger, inventory] of [
    ['source', expected.inventories.sourceFiles],
    ['runtimeExports', expected.publicSurface.runtimeExports],
    ['typeExports', expected.publicSurface.typeExports],
    ['unitCases', expected.inventories.unitCases.map((value) => value.id)],
    ['browserCases', expected.inventories.browserCases.map((value) => value.id)],
    ['fixtures', expected.inventories.fixtures],
    ['typeAssertions', expected.inventories.typeAssertions.map((value) => value.id)],
  ]) {
    sameIdentities(expected.crosswalk[ledger], inventory, `${ledger} disposition`, (value) => value.upstream ?? value);
  }
  const allDispositions = Object.values(expected.crosswalk).flat();
  assert(!allDispositions.some((value) => /\.skip|\.todo|expected.?failure/i.test(value.disposition ?? '')), 'skip marker is not an approved disposition');
  assert(!allDispositions.some((value) => !value.disposition || /pending|unresolved/i.test(value.disposition)), 'every upstream item must have a resolved disposition');
  assert(!allDispositions.some((value) => !Array.isArray(value.evidence) || value.evidence.length === 0), 'every upstream disposition must cite executable or source evidence');
  const availableEvidence = new Set((await filesUnder(root)).filter((path) => !path.startsWith('upstream/')));
  const adaptedCaseIds = new Set(expected.inventories.adaptedCases.map((value) => value.id));
  for (const value of allDispositions) {
    for (const path of value.evidence) assert(availableEvidence.has(path), `crosswalk evidence is missing: ${path}`);
    if (['unit-case', 'browser-case', 'type-assertion'].includes(value.kind)) {
      assert(Array.isArray(value.adaptedCases) && value.adaptedCases.length > 0, `${value.upstream}: explicit adapted case mapping is missing`);
      for (const id of value.adaptedCases) assert(adaptedCaseIds.has(id), `${value.upstream}: adapted case is missing: ${id}`);
    }
  }

  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  sameIdentities(Object.keys(manifest.exports), ['.', './package.json'], 'package subpath');
  assert(!manifest.files.some((path) => /^(?:upstream|audit|tests\/audit)(?:\/|$)/.test(path)), 'audit evidence must not be published');
  const license = await readFile(join(root, 'LICENSE'), 'utf8');
  const upstreamLicense = await readFile(join(root, 'upstream/tag/LICENSE'), 'utf8');
  assert(license === upstreamLicense && license.includes('MIT License'), 'MIT license is missing or changed');
  return actual;
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
  const write = process.argv.includes('--write');
  const rootArg = process.argv.indexOf('--root');
  const root = rootArg === -1 ? packageRoot : resolve(process.argv[rootArg + 1]);
  if (write) {
    await writeFile(join(root, 'audit/upstream-inventory.json'), `${JSON.stringify(await buildInventory(root), null, 2)}\n`);
    console.log('wrote react-draggable upstream inventory');
  } else {
    const result = await validate(root);
    console.log(`verified ${result.artifacts.length} artifacts, ${result.inventories.unitCases.length} unit/type cases, ${result.inventories.browserCases.length} browser cases, and ${result.inventories.typeAssertions.length} type assertions`);
  }
}
