import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SKILL_NAME = 'octane-react-library-port';
const SKILL_PATH = `skills/${SKILL_NAME}`;
const CANONICAL_ROOT = path.join(REPO_ROOT, '.rulesync', SKILL_PATH);
const GENERATED_ROOTS = ['.agents', '.claude', '.cursor', '.gemini', '.github'].map((root) =>
	path.join(REPO_ROOT, root, SKILL_PATH),
);
const REFERENCES = [
	'intake-and-license.md',
	'dependencies-and-feasibility.md',
	'implementation-and-evidence.md',
];

function body(markdown) {
	return markdown.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/^\n/, '');
}

describe('octane-react-library-port skill distribution', () => {
	test('keeps the canonical entry point thin and makes preflight mandatory', () => {
		const skill = readFileSync(path.join(CANONICAL_ROOT, 'SKILL.md'), 'utf8');
		assert.match(skill, new RegExp(`^name: ${SKILL_NAME}$`, 'm'));
		assert.match(skill, /pnpm react-port:preflight/);
		assert.match(skill, /Do not (?:create|edit).*binding/i);
		for (const reference of REFERENCES) {
			assert.match(skill, new RegExp(`references/${reference.replace('.', '\\.')}`));
		}
		assert.ok(skill.split('\n').length < 180, 'SKILL.md should route detail into references');
	});

	test('generates the complete multi-file skill for every configured consumer', () => {
		const canonicalSkillBody = body(readFileSync(path.join(CANONICAL_ROOT, 'SKILL.md'), 'utf8'));
		for (const generatedRoot of GENERATED_ROOTS) {
			assert.equal(
				body(readFileSync(path.join(generatedRoot, 'SKILL.md'), 'utf8')),
				canonicalSkillBody,
				generatedRoot,
			);
			for (const reference of REFERENCES) {
				assert.equal(
					readFileSync(path.join(generatedRoot, 'references', reference), 'utf8'),
					readFileSync(path.join(CANONICAL_ROOT, 'references', reference), 'utf8'),
					`${generatedRoot}: ${reference}`,
				);
			}
		}
	});
});
