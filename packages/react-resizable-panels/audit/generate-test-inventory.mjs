import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(auditRoot, '../upstream/source/lib');
const packageRoot = resolve(auditRoot, '..');
const adaptedRoot = join(packageRoot, 'tests/upstream');
const adaptedOverrides = new Map([
  ['global/utils/getImperativeGroupMethods.test.ts', 'components/group/getImperativeGroupMethods.test.ts'],
  ['global/utils/getImperativePanelMethods.test.ts', 'components/panel/getImperativePanelMethods.test.ts'],
]);
const paths = readdirSync(sourceRoot, { recursive: true })
  .map((path) => join(sourceRoot, path))
  .filter((path) => statSync(path).isFile())
  .filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path))
  .sort();
const artifacts = paths.map((path) => {
  const source = readFileSync(path, 'utf8');
  const identities = [...source.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)].map(
    (match) => match[2],
  );
  const upstreamPath = relative(sourceRoot, path);
  const defaultAdaptedPath = upstreamPath.replace(/\.tsx$/, '.tsrx');
  const adaptedPath = adaptedOverrides.get(upstreamPath) ?? defaultAdaptedPath;
  const adaptedAbsolute = join(adaptedRoot, adaptedPath);
  const isAdapted = statExists(adaptedAbsolute);
  return {
    path: upstreamPath,
    registrationCount: identities.length,
    identities,
    disposition: isAdapted ? 'adapted' : 'accounted-not-adapted',
    ...(isAdapted ? { adaptedPath: `tests/upstream/${adaptedPath}` } : {}),
  };
});

function statExists(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

const portRoots = ['tests/browser', 'tests/conformance', 'tests/differential', 'tests/hydration', 'tests/ssr'];
const portArtifacts = portRoots.flatMap((root) => {
  const absolute = join(packageRoot, root);
  try { if (!statSync(absolute).isDirectory()) return []; } catch { return []; }
  return readdirSync(absolute, { recursive: true })
    .map((path) => join(absolute, path))
    .filter((path) => statSync(path).isFile() && /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path))
    .map((path) => {
      const source = readFileSync(path, 'utf8');
      const identities = [...source.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)].map((match) => match[2]);
      return { path: relative(packageRoot, path), registrationCount: identities.length, identities, classification: 'port-authored' };
    });
}).sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(
  join(auditRoot, 'test-inventory.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      root: 'upstream/source/lib',
      artifactCount: artifacts.length,
      registrationCount: artifacts.reduce((total, artifact) => total + artifact.registrationCount, 0),
      artifacts,
    },
    null,
    2,
  )}\n`,
);
writeFileSync(join(auditRoot, 'port-test-inventory.json'), `${JSON.stringify({
  schemaVersion: 1,
  artifactCount: portArtifacts.length,
  registrationCount: portArtifacts.reduce((total, artifact) => total + artifact.registrationCount, 0),
  artifacts: portArtifacts,
}, null, 2)}\n`);
