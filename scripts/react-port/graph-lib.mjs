import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
	KNOWN_BINDINGS,
	KNOWN_NATIVE_BINDINGS,
	KNOWN_VANILLA_CORES,
	REACT_API_MAP,
} from '../../packages/octane-mcp-server/src/bridge.js';
import { getBindingPackages, REPO_ROOT } from '../workspace-packages.mjs';
import { fingerprint } from './preflight-lib.mjs';
import { rangesOverlap, satisfiesRange } from './version-lib.mjs';

export { satisfiesRange } from './version-lib.mjs';

const OCTANE_RUNTIME_PACKAGES = new Set([
	'react',
	'react-dom',
	'react-dom/client',
	'react-dom/server',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
]);

function sortedRecord(record) {
	return Object.fromEntries(
		Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
	);
}

function manifestExports(manifest) {
	if (!manifest.exports) return manifest.main || manifest.module ? ['.'] : [];
	if (typeof manifest.exports === 'string') return ['.'];
	const keys = Object.keys(manifest.exports);
	return (keys.some((key) => key.startsWith('.')) ? keys : ['.']).sort();
}

export function buildCapabilityInventory({
	bindings,
	knownBindings,
	knownNativeBindings = [],
	knownVanillaCores,
	reactApiMap,
	octanePublicSourceSha256,
	differencesSha256,
}) {
	const bindingRecord = Object.fromEntries(
		bindings
			.map((binding) => [
				binding.name,
				{
					name: binding.name,
					version: binding.version,
					exports: [...(binding.exports ?? [])].sort(),
					status: binding.status,
				},
			])
			.sort(([left], [right]) => left.localeCompare(right)),
	);
	const inventory = {
		schemaVersion: 1,
		sourceBindings: sortedRecord(knownBindings),
		nativeBindings: [...knownNativeBindings].sort(),
		vanillaCores: sortedRecord(knownVanillaCores),
		reactApis: sortedRecord(reactApiMap),
		bindings: bindingRecord,
		octanePublicSourceSha256,
		differencesSha256,
	};
	return { ...inventory, fingerprint: fingerprint(inventory) };
}

function hashFile(filePath) {
	return fingerprint(readFileSync(filePath, 'utf8'));
}

export function readRepositoryCapabilityInventory(repoRoot = REPO_ROOT) {
	const bindings = getBindingPackages().map((binding) => {
		if (!existsSync(binding.statusPath)) {
			throw new Error(`Binding ${binding.name} has no status.json`);
		}
		return {
			name: binding.name,
			version: binding.version,
			exports: manifestExports(binding.manifest),
			status: JSON.parse(readFileSync(binding.statusPath, 'utf8')),
		};
	});
	return buildCapabilityInventory({
		bindings,
		knownBindings: KNOWN_BINDINGS,
		knownNativeBindings: KNOWN_NATIVE_BINDINGS,
		knownVanillaCores: KNOWN_VANILLA_CORES,
		reactApiMap: REACT_API_MAP,
		octanePublicSourceSha256: hashFile(path.join(repoRoot, 'packages/octane/src/index.ts')),
		differencesSha256: hashFile(path.join(repoRoot, 'docs/differences-from-react.md')),
	});
}

function packageNameFromBlockedTarget(target) {
	if (target.identity?.packageName) return target.identity.packageName;
	const input = String(target.input ?? 'unknown');
	if (input.startsWith('@')) {
		const separator = input.indexOf('@', input.indexOf('/'));
		return separator === -1 ? input : input.slice(0, separator);
	}
	const separator = input.lastIndexOf('@');
	return separator > 0 ? input.slice(0, separator) : input;
}

function existingBindingAssessment(node, inventory) {
	const bindingName = inventory.sourceBindings[node.packageName];
	if (!bindingName) return null;
	const binding = inventory.bindings[bindingName];
	if (!binding) {
		return {
			adequate: false,
			reason: `${bindingName} is registered but missing from the workspace inventory.`,
		};
	}
	if (binding.status?.upstream?.package !== node.packageName) {
		return {
			adequate: false,
			reason: `${bindingName} status targets ${binding.status?.upstream?.package ?? 'no upstream package'}.`,
		};
	}
	if (!binding.status.verified || binding.status.verified === 'partial') {
		return { adequate: false, reason: `${bindingName} has not recorded complete verification.` };
	}
	if (
		!node.constraints.every((constraint) =>
			satisfiesRange(binding.status.upstream.version, constraint.range),
		)
	) {
		return {
			adequate: false,
			reason: `${bindingName} covers ${binding.status.upstream.version}, outside a required version lane.`,
		};
	}
	if (!(node.requiredSubpaths ?? []).every((subpath) => binding.exports.includes(subpath))) {
		return { adequate: false, reason: `${bindingName} does not publish every required subpath.` };
	}
	return { adequate: true, binding };
}

function stronglyConnectedComponents(nodes) {
	let nextIndex = 0;
	const stack = [];
	const indexes = new Map();
	const lowLinks = new Map();
	const onStack = new Set();
	const components = [];

	function visit(id) {
		indexes.set(id, nextIndex);
		lowLinks.set(id, nextIndex);
		nextIndex += 1;
		stack.push(id);
		onStack.add(id);
		for (const dependency of nodes[id].dependsOn) {
			if (!nodes[dependency] || nodes[dependency].state === 'blocked') continue;
			if (!indexes.has(dependency)) {
				visit(dependency);
				lowLinks.set(id, Math.min(lowLinks.get(id), lowLinks.get(dependency)));
			} else if (onStack.has(dependency)) {
				lowLinks.set(id, Math.min(lowLinks.get(id), indexes.get(dependency)));
			}
		}
		if (lowLinks.get(id) !== indexes.get(id)) return;
		const component = [];
		let member;
		do {
			member = stack.pop();
			onStack.delete(member);
			component.push(member);
		} while (member !== id);
		components.push(component.sort());
	}

	for (const id of Object.keys(nodes).sort()) {
		if (nodes[id].state !== 'blocked' && !indexes.has(id)) visit(id);
	}
	return components;
}

function orderComponents(nodes, components) {
	const componentByNode = new Map();
	components.forEach((component, index) =>
		component.forEach((id) => componentByNode.set(id, index)),
	);
	const dependencies = components.map(() => new Set());
	const dependents = components.map(() => new Set());
	components.forEach((component, index) => {
		for (const id of component) {
			for (const dependency of nodes[id].dependsOn) {
				const dependencyComponent = componentByNode.get(dependency);
				if (dependencyComponent === undefined || dependencyComponent === index) continue;
				dependencies[index].add(dependencyComponent);
				dependents[dependencyComponent].add(index);
			}
		}
	});
	const ready = components
		.map((component, index) => ({ component, index }))
		.filter(({ index }) => dependencies[index].size === 0)
		.sort((left, right) => left.component[0].localeCompare(right.component[0]));
	const ordered = [];
	while (ready.length > 0) {
		const current = ready.shift();
		ordered.push(current.component);
		for (const dependent of dependents[current.index]) {
			dependencies[dependent].delete(current.index);
			if (dependencies[dependent].size === 0) {
				ready.push({ component: components[dependent], index: dependent });
				ready.sort((left, right) => left.component[0].localeCompare(right.component[0]));
			}
		}
	}
	return ordered;
}

export function planPortGraph({ targets, inventory, dependencyClassifications = {} }) {
	const nodes = {};
	const targetByPackage = new Map();

	function ensureNode(packageName) {
		const id = `pkg:${packageName}`;
		if (!nodes[id]) {
			nodes[id] = {
				id,
				packageName,
				constraints: [],
				dependsOn: [],
				requested: false,
				state: 'classified',
				action: 'audit-dependency',
				blockers: [],
				repair: null,
			};
		}
		return nodes[id];
	}

	for (const target of targets) {
		const packageName = packageNameFromBlockedTarget(target);
		const node = ensureNode(packageName);
		node.requested ||= target.requested !== false;
		node.input = target.input;
		if (target.identity?.version) {
			node.constraints.push({ range: target.identity.version, via: packageName });
			node.version = target.identity.version;
			node.identity = target.identity;
			node.license = target.license;
			node.provenance = target.provenance;
			targetByPackage.set(packageName, target);
		}
		if (target.sourceAnalysis) {
			node.feasibility = {
				verdict: target.sourceAnalysis.verdict,
				filesScanned: target.sourceAnalysis.filesScanned,
				truncated: target.sourceAnalysis.truncated,
				hazards: target.sourceAnalysis.hazards ?? [],
				apis: target.sourceAnalysis.apis ?? [],
			};
		}
		if (target.status === 'blocked') {
			node.state = 'blocked';
			node.action = 'repair-preflight';
			node.blockers.push(...(target.blockers ?? ['Target did not pass preflight.']));
			node.repair = target.repair ?? 'Repair identity or exact-MIT evidence.';
		}
	}

	for (const target of targets) {
		if (target.status !== 'licensed') continue;
		const targetNode = ensureNode(target.identity.packageName);
		for (const [dependencyName, range] of Object.entries(target.runtimeDependencies ?? {}).sort()) {
			if (OCTANE_RUNTIME_PACKAGES.has(dependencyName)) continue;
			const dependencyNode = ensureNode(dependencyName);
			dependencyNode.constraints.push({ range, via: target.identity.packageName });
			targetNode.dependsOn.push(dependencyNode.id);
		}
	}

	for (const node of Object.values(nodes)) {
		node.constraints.sort((left, right) =>
			left.via === right.via
				? left.range.localeCompare(right.range)
				: left.via.localeCompare(right.via),
		);
		node.dependsOn = [...new Set(node.dependsOn)].sort();
		for (let left = 0; left < node.constraints.length; left += 1) {
			for (let right = left + 1; right < node.constraints.length; right += 1) {
				if (rangesOverlap(node.constraints[left].range, node.constraints[right].range)) continue;
				node.state = 'blocked';
				node.action = 'resolve-version-conflict';
				node.blockers.push(
					`Incompatible version lanes from ${node.constraints[left].via} (${node.constraints[left].range}) and ${node.constraints[right].via} (${node.constraints[right].range}).`,
				);
				node.repair = 'Choose compatible upstream version lanes or split the batch explicitly.';
			}
		}
		if (node.state === 'blocked') continue;

		const existing = existingBindingAssessment(node, inventory);
		const target = targetByPackage.get(node.packageName);
		if (existing?.adequate) {
			node.state = 'verified';
			node.action = 'reuse-binding';
			node.binding = existing.binding.name;
			continue;
		}
		if (
			node.feasibility?.truncated ||
			node.feasibility?.verdict === 'needs-rework' ||
			node.feasibility?.hazards.length > 0
		) {
			node.state = 'blocked';
			node.action = 'feasibility-blocker';
			node.blockers.push(
				...(node.feasibility.hazards.length > 0
					? node.feasibility.hazards
					: [
							node.feasibility.truncated
								? 'Shipped source exceeded the bounded feasibility scan.'
								: 'Shipped source uses an unsupported React surface or class-only design.',
						]),
			);
			node.repair =
				'Define a bounded rewrite or route a missing primitive to its owning Octane package before implementation.';
			continue;
		}
		if (inventory.sourceBindings[node.packageName]) {
			node.binding = inventory.sourceBindings[node.packageName];
			node.action = 'extend-binding';
			if (target?.status === 'licensed') {
				node.state = 'ready';
				node.evidenceFingerprint = target.evidenceFingerprint;
			} else {
				node.state = 'blocked';
				node.blockers.push(
					existing?.reason ?? 'Existing binding requires evidence-backed extension.',
				);
				node.repair = `Run exact-MIT preflight for ${node.packageName}, then extend ${node.binding}.`;
			}
			continue;
		}

		const classification = dependencyClassifications[node.packageName];
		if (!node.requested && classification === 'framework-neutral') {
			node.state = 'verified';
			node.action = 'reuse-package';
			continue;
		}
		if (classification === 'unsupported') {
			node.state = 'blocked';
			node.action = 'feasibility-blocker';
			node.blockers.push(
				'Dependency requires an unsupported React internal or custom renderer surface.',
			);
			node.repair =
				'Route the missing primitive to its owning Octane package or remove the target.';
			continue;
		}
		if (target?.status === 'licensed') {
			node.state = 'ready';
			node.action = 'create-binding';
			node.evidenceFingerprint = target.evidenceFingerprint;
			node.vanillaCore = inventory.vanillaCores[node.packageName] ?? null;
			continue;
		}
		node.state = 'blocked';
		node.action =
			classification === 'react-coupled' ? 'preflight-prerequisite' : 'audit-dependency';
		node.blockers.push(
			classification === 'react-coupled'
				? 'React-coupled prerequisite has not passed identity and exact-MIT preflight.'
				: 'Runtime dependency has not been classified from its shipped surface.',
		);
		node.repair =
			classification === 'react-coupled'
				? `Add ${node.packageName} to preflight and rerun the union graph.`
				: 'Inspect effective shipped imports, then classify this dependency as framework-neutral, React-coupled, or unsupported.';
	}

	let changed = true;
	while (changed) {
		changed = false;
		for (const node of Object.values(nodes)) {
			if (node.state === 'blocked') continue;
			const blockedDependencies = node.dependsOn.filter((id) => nodes[id]?.state === 'blocked');
			if (blockedDependencies.length === 0) continue;
			node.state = 'blocked';
			node.blockers.push(`Blocked prerequisite(s): ${blockedDependencies.join(', ')}.`);
			node.repair = 'Repair every named prerequisite, then rebuild the graph.';
			changed = true;
		}
	}

	for (const node of Object.values(nodes)) {
		const bindingCapability = node.binding ? (inventory.bindings[node.binding] ?? null) : null;
		node.nodeFingerprint = fingerprint({
			packageName: node.packageName,
			constraints: node.constraints,
			dependsOn: node.dependsOn,
			action: node.action,
			bindingCapability,
			vanillaCore: node.vanillaCore ?? null,
			octanePublicSourceSha256: inventory.octanePublicSourceSha256,
			differencesSha256: inventory.differencesSha256,
			reactApis: node.action === 'reuse-package' ? null : inventory.reactApis,
			feasibility: node.feasibility ?? null,
			identity: node.identity ?? null,
			license: node.license ?? null,
			provenance: node.provenance ?? null,
			blockers: node.blockers,
		});
		node.evidenceFingerprint ??= node.nodeFingerprint;
	}

	const orderedNodes = Object.fromEntries(
		Object.entries(nodes).sort(([left], [right]) => left.localeCompare(right)),
	);
	const executionUnits = orderComponents(orderedNodes, stronglyConnectedComponents(orderedNodes));
	return {
		schemaVersion: 1,
		inventoryFingerprint: inventory.fingerprint,
		nodes: orderedNodes,
		executionUnits,
		executionOrder: executionUnits.flat(),
		fingerprint: fingerprint({
			inventoryFingerprint: inventory.fingerprint,
			nodes: orderedNodes,
			executionUnits,
		}),
	};
}
