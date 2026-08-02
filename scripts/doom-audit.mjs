#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const classifications = new Set(['unchanged', 'mechanically-transformed', 'owned-divergence']);
const evidenceKinds = new Set(['browser', 'unit', 'manual', 'divergence']);

function requireText(value, label) {
	if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`);
}

function uniqueIds(entries, label) {
	const ids = new Set();
	for (const entry of entries) {
		requireText(entry.id, `${label} id`);
		if (ids.has(entry.id)) throw new Error(`duplicate ${label} id ${entry.id}`);
		ids.add(entry.id);
	}
}

export function validateDoomAudit(audit) {
	if (!audit || typeof audit !== 'object') throw new Error('audit must be an object');
	requireText(audit.provenance?.repository, 'provenance repository');
	if (!/^[a-f0-9]{40}$/.test(audit.provenance?.commit ?? '')) {
		throw new Error('provenance commit must be a full SHA');
	}
	if (audit.provenance.license !== 'NOASSERTION' || audit.provenance.vendored !== false) {
		throw new Error('unlicensed oracle must remain external and unvendored');
	}
	const roles = audit.attestations ?? {};
	for (const role of ['oracleResearcher', 'migrationImplementer', 'reviewer']) {
		requireText(roles[role], `attestation ${role}`);
	}
	if (roles.oracleResearcher === roles.migrationImplementer) {
		throw new Error('oracle researcher and migration implementer must be isolated');
	}
	if (!Array.isArray(audit.behaviors) || audit.behaviors.length === 0) {
		throw new Error('audit needs at least one behavior');
	}
	uniqueIds(audit.behaviors, 'behavior');
	for (const behavior of audit.behaviors) {
		requireText(behavior.observation, `behavior ${behavior.id} observation`);
		if (!Array.isArray(behavior.evidence))
			throw new Error(`behavior ${behavior.id} evidence must be an array`);
		if (behavior.required && behavior.evidence.length === 0) {
			throw new Error(`required behavior ${behavior.id} has no evidence`);
		}
		for (const evidence of behavior.evidence) {
			if (!evidenceKinds.has(evidence.kind)) {
				throw new Error(`behavior ${behavior.id} has invalid evidence kind`);
			}
			requireText(evidence.target, `behavior ${behavior.id} evidence target`);
		}
	}
	if (!Array.isArray(audit.constructs) || audit.constructs.length === 0) {
		throw new Error('audit needs at least one construct mapping');
	}
	uniqueIds(audit.constructs, 'construct');
	for (const construct of audit.constructs) {
		requireText(construct.family, `construct ${construct.id} family`);
		if (!classifications.has(construct.classification)) {
			throw new Error(`construct ${construct.id} has invalid classification`);
		}
		requireText(construct.evidence, `construct ${construct.id} evidence`);
	}
	if (!Array.isArray(audit.assets) || audit.assets.length === 0) {
		throw new Error('audit needs at least one asset mapping');
	}
	uniqueIds(audit.assets, 'asset');
	for (const asset of audit.assets) {
		for (const key of ['path', 'kind', 'license', 'creator', 'role']) {
			requireText(asset[key], `asset ${asset.id} ${key}`);
		}
		if (asset.license === 'NOASSERTION') {
			throw new Error(`asset ${asset.id} lacks redistribution permission`);
		}
	}
	return audit;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
	const auditPath = resolve(root, 'playground/octane/doom-audit/audit.json');
	validateDoomAudit(JSON.parse(readFileSync(auditPath, 'utf8')));
	console.log('Doom clean-room completeness audit is valid.');
}
