import { resolveBinding } from '../data/index.js';
import { readInstalled } from '../kernel/project.js';
import path from 'node:path';
import { buildImportGraph } from './graph.js';

/**
 * @typedef {{
 *   specifier: string,
 *   package: string,
 *   classification: 'supported' | 'blocked' | 'candidate',
 *   replacement: string | null,
 *   evidence: string,
 *   version?: string
 * }} PackageClassification
 */

/** @param {string} specifier */
function packageName(specifier) {
	const segments = specifier.split('/');
	return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

/** @param {any} manifest @param {string} importedPackage */
function packageHasReactEvidence(manifest, importedPackage) {
	if (importedPackage === 'react' || importedPackage === 'react-dom') return true;
	const dependencyGroups = [
		manifest?.dependencies,
		manifest?.peerDependencies,
		manifest?.optionalDependencies,
	];
	return dependencyGroups.some(
		(group) => group && (group.react !== undefined || group['react-dom'] !== undefined),
	);
}

/** @param {any} manifest @param {string} specifier @param {string} name */
function exportTarget(manifest, specifier, name) {
	const key = specifier === name ? '.' : `.${specifier.slice(name.length)}`;
	let target = manifest?.exports?.[key];
	if (target === undefined && key === '.')
		target = manifest?.exports ?? manifest?.module ?? manifest?.main;
	while (target && typeof target === 'object' && !Array.isArray(target)) {
		target = target.import ?? target.browser ?? target.default ?? Object.values(target)[0];
	}
	if (Array.isArray(target)) target = target.find((value) => typeof value === 'string');
	return typeof target === 'string' ? target : null;
}

/**
 * @param {{ dir: string, manifest: any }} installed
 * @param {string} specifier
 * @param {string} name
 * @returns {boolean | null}
 */
function entryReactEvidence(installed, specifier, name) {
	const target = exportTarget(installed.manifest, specifier, name);
	if (!target || !target.startsWith('.')) return null;
	const file = path.resolve(installed.dir, target);
	try {
		const graph = buildImportGraph([file]);
		const reactImport =
			/(?:from\s*|import\s*\(|require\s*\()\s*['"](?:react|react-dom)(?:\/[^'"]*)?['"]/;
		if (graph.files.some((entry) => reactImport.test(entry.source))) return true;
		if (
			graph.unresolved.length > 0 ||
			graph.files.length === 0 ||
			graph.files.some((entry) => entry.parseError !== null)
		) {
			return null;
		}
		return false;
	} catch {
		return null;
	}
}

/**
 * @param {string} root
 * @param {string} specifier
 * @param {string} [importer]
 * @returns {PackageClassification}
 */
export function classifyPackageImport(root, specifier, importer) {
	if (specifier === 'octane' || specifier.startsWith('octane/')) {
		return {
			specifier,
			package: 'octane',
			classification: 'supported',
			replacement: specifier,
			evidence: 'octane-runtime',
		};
	}
	if (specifier === 'react' || specifier === 'react/jsx-runtime') {
		return {
			specifier,
			package: 'react',
			classification: 'supported',
			replacement: specifier === 'react' ? 'octane' : 'octane/jsx-runtime',
			evidence: 'octane-runtime',
		};
	}
	const exactMapped = resolveBinding(specifier);
	if (exactMapped) {
		return {
			specifier,
			package: packageName(specifier),
			classification: 'supported',
			replacement: exactMapped.binding.name,
			evidence: `binding-catalog:${exactMapped.via}`,
		};
	}

	const name = packageName(specifier);
	const rootMapped = resolveBinding(name);
	if (rootMapped && specifier !== name) {
		const isBindingSubpath = rootMapped.binding.name === name;
		return {
			specifier,
			package: name,
			classification: isBindingSubpath ? 'supported' : 'blocked',
			replacement: isBindingSubpath ? specifier : null,
			evidence: isBindingSubpath
				? 'binding-catalog:binding-subpath'
				: 'binding-catalog:unmapped-subpath',
		};
	}

	const installed = readInstalled(importer ? path.dirname(importer) : root, name);
	if (!installed) {
		return {
			specifier,
			package: name,
			classification: 'blocked',
			replacement: null,
			evidence: 'package-manifest-missing',
		};
	}
	const entryEvidence = entryReactEvidence(installed, specifier, name);
	const reactBound = entryEvidence ?? packageHasReactEvidence(installed.manifest, name);
	return {
		specifier,
		package: name,
		classification: reactBound ? 'blocked' : 'candidate',
		replacement: null,
		evidence:
			entryEvidence === true
				? 'react-entrypoint'
				: entryEvidence === false
					? 'framework-independent-entrypoint'
					: reactBound
						? 'react-dependency'
						: 'no-react-evidence',
		version: installed.version,
	};
}
