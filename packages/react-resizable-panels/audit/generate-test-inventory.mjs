import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(auditRoot, '../upstream/source/lib');
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
  return {
    path: relative(sourceRoot, path),
    registrationCount: identities.length,
    identities,
    disposition: 'pending-adaptation',
  };
});
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
