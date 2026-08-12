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

function canonicalDocuments() {
	return [
		readFileSync(path.join(CANONICAL_ROOT, 'SKILL.md'), 'utf8'),
		...REFERENCES.map((reference) =>
			readFileSync(path.join(CANONICAL_ROOT, 'references', reference), 'utf8'),
		),
	].join('\n');
}

describe('octane-react-library-port skill distribution', () => {
	test('makes completed binding code the autonomous local outcome', () => {
		const skill = readFileSync(path.join(CANONICAL_ROOT, 'SKILL.md'), 'utf8');
		assert.match(skill, new RegExp(`^name: ${SKILL_NAME}$`, 'm'));
		assert.match(skill, /primary deliverable is (?:the )?completed binding code/i);
		assert.match(
			skill,
			/invocation itself authorizes[\s\S]*local writes[\s\S]*tests[\s\S]*install[\s\S]*generation/i,
		);
		assert.match(skill, /do not ask\s+(?:the\s+user\s+)?to advance stages/i);
		assert.match(skill, /never (?:commit|commits?)[\s\S]*push[\s\S]*(?:PR|pull request)/i);
		assert.match(skill, /preflight[\s\S]*graph[\s\S]*report[\s\S]*internal safety gates/i);
		assert.match(skill, /never (?:the )?(?:outcome|deliverable)/i);
		assert.match(skill, /binding code[\s\S]*tests[\s\S]*provenance[\s\S]*evidence/i);
		assert.doesNotMatch(skill, /label every requested target `actionable`/i);
	});

	test('orders evidence initialization before binding writes and terminal only at the end', () => {
		const skill = readFileSync(path.join(CANONICAL_ROOT, 'SKILL.md'), 'utf8');
		const initIndex = skill.indexOf('pnpm react-port:evidence init');
		const implementationIndex = skill.indexOf('**Implement');
		const verifyIndex = skill.indexOf('pnpm react-port:evidence verify');
		const terminalIndex = skill.indexOf('pnpm react-port:terminal --batch');
		assert.ok(initIndex >= 0, 'skill must initialize evidence');
		assert.ok(implementationIndex >= 0, 'skill must contain an implementation step');
		assert.ok(initIndex < implementationIndex, 'evidence init must precede implementation writes');
		assert.ok(verifyIndex > implementationIndex, 'machine verification must follow implementation');
		assert.ok(terminalIndex > verifyIndex, 'terminal tripwire must follow verification');
		assert.match(skill, /ready[^\n]*[\s\S]*evidence init[\s\S]*ready[^\n]*implementing/i);
		assert.match(skill, /terminal[^\n]*final tripwire/i);
		assert.match(skill, /not a preflight deliverable/i);
		assert.match(skill, /execute every[\s\S]*nextAction[\s\S]*rerun/i);
		assert.equal(
			[...skill.matchAll(/pnpm react-port:terminal --batch/g)].length,
			1,
			'terminal should appear only as the final tripwire',
		);
	});

	test('documents pnpm 11-safe public CLI invocations and clean-room closure proof', () => {
		const documents = canonicalDocuments();
		assert.match(
			readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8'),
			/^\.react-port-work\/$/m,
		);
		assert.match(documents, /pnpm react-port:preflight --batch/);
		for (const command of ['init', 'record', 'run', 'verify']) {
			assert.match(documents, new RegExp(`pnpm react-port:evidence ${command}\\b`));
		}
		assert.match(documents, /pnpm react-port:evidence run[^\n]*[\s\S]*-- <executable>/);
		assert.match(documents, /pnpm react-port:terminal --batch/);
		assert.doesNotMatch(documents, /react-port:(?:preflight|terminal)\s+--\s+--batch/);
		assert.doesNotMatch(documents, /react-port:evidence\s+--\s+(?:init|record|run|verify)\b/);

		const implementation = readFileSync(
			path.join(CANONICAL_ROOT, 'references', 'implementation-and-evidence.md'),
			'utf8',
		);
		assert.match(implementation, /ignore or remove[^\n]*source-derived plans/i);
		assert.match(implementation, /reimplementedDependencies/);
		assert.match(implementation, /packageName/);
		assert.match(implementation, /nonempty `?publicBehaviors`?/i);
		assert.match(implementation, /independently authored\s+`?localEvidence`? paths/i);
	});

	test('keeps the canonical entry point thin and makes preflight mandatory', () => {
		const skill = readFileSync(path.join(CANONICAL_ROOT, 'SKILL.md'), 'utf8');
		assert.match(skill, /pnpm react-port:preflight/);
		assert.match(skill, /Do not (?:create|edit).*binding/i);
		assert.match(skill, /pending-intake[\s\S]*work queues/i);
		assert.match(skill, /do not end on a progress report/i);
		assert.match(skill, /missing Vitest projects/i);
		assert.match(skill, /pnpm react-port:terminal/);
		assert.match(skill, /nextActions?/);
		assert.match(skill, /Commit,\s+push,\s+issue,\s+and\s+PR actions require separate authority/);
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
