import { createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const PACKAGE_NAME_PATTERN =
	/^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/;
const GITHUB_PART_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;
const SENSITIVE_KEY_PATTERN = /(?:authorization|cookie|password|secret|token|api[-_]?key)/i;
const SENSITIVE_VALUE_PATTERN = /\b(?:gh[oprsu]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g;
const SUPPORTED_INTEGRITY_ALGORITHMS = ['sha512', 'sha384', 'sha256'];

const DEFAULT_ARCHIVE_LIMITS = Object.freeze({
	maxFiles: 10_000,
	maxFileBytes: 100 * 1024 * 1024,
	maxTotalBytes: 250 * 1024 * 1024,
	maxDepth: 32,
});
const REMOTE_LIMITS = Object.freeze({
	jsonBytes: 8 * 1024 * 1024,
	artifactBytes: 32 * 1024 * 1024,
	expandedArtifactBytes: 300 * 1024 * 1024,
	licenseBytes: 1024 * 1024,
	redirects: 3,
});
const LICENSE_NAME_PATTERN = /^(?:licen[cs]e|copying)(?:\..*)?$/i;
const NOTICE_NAME_PATTERN = /^notice(?:\..*)?$/i;

function assertPackageName(packageName) {
	if (!PACKAGE_NAME_PATTERN.test(packageName)) {
		throw new Error(`Invalid package input: ${packageName}`);
	}
}

function parsePackageSpecifier(input) {
	let packageName;
	let selector = null;

	if (input.startsWith('@')) {
		const slash = input.indexOf('/');
		const selectorSeparator = slash === -1 ? -1 : input.indexOf('@', slash);
		packageName = selectorSeparator === -1 ? input : input.slice(0, selectorSeparator);
		selector = selectorSeparator === -1 ? null : input.slice(selectorSeparator + 1);
	} else {
		const selectorSeparator = input.lastIndexOf('@');
		packageName = selectorSeparator <= 0 ? input : input.slice(0, selectorSeparator);
		selector = selectorSeparator <= 0 ? null : input.slice(selectorSeparator + 1);
	}

	assertPackageName(packageName);
	if (selector !== null && (!selector || /[\s\\/]/.test(selector))) {
		throw new Error(`Invalid package input selector: ${input}`);
	}

	return { kind: 'npm', packageName, selector };
}

function decodePathPart(part, label) {
	let decoded;
	try {
		decoded = decodeURIComponent(part);
	} catch {
		throw new Error(`Invalid ${label} encoding`);
	}
	if (
		!decoded ||
		decoded === '.' ||
		decoded === '..' ||
		decoded.includes('/') ||
		decoded.includes('\\')
	) {
		throw new Error(`Invalid ${label}`);
	}
	return decoded;
}

function parseNpmUrl(url) {
	const parts = url.pathname.split('/').filter(Boolean);
	if (parts[0] !== 'package') {
		throw new Error('Only supported npm package URLs may be used');
	}

	let packageName;
	let cursor;
	if (parts[1]?.startsWith('@')) {
		if (!parts[2]) throw new Error('Invalid npm package URL');
		packageName = `${decodePathPart(parts[1], 'npm scope')}/${decodePathPart(parts[2], 'npm package')}`;
		cursor = 3;
	} else {
		packageName = decodePathPart(parts[1] ?? '', 'npm package');
		cursor = 2;
	}
	assertPackageName(packageName);

	let selector = null;
	if (parts.length > cursor) {
		if (parts[cursor] !== 'v' || parts.length !== cursor + 2) {
			throw new Error('Only supported npm package version URLs may be used');
		}
		selector = decodePathPart(parts[cursor + 1], 'npm version');
	}

	return { kind: 'npm', packageName, selector };
}

function parseGitHubUrl(url) {
	const parts = url.pathname.split('/').filter(Boolean);
	if (parts.length < 2) throw new Error('Invalid GitHub repository URL');

	const owner = decodePathPart(parts[0], 'GitHub owner');
	const repo = decodePathPart(parts[1], 'GitHub repository').replace(/\.git$/, '');
	if (!GITHUB_PART_PATTERN.test(owner) || !GITHUB_PART_PATTERN.test(repo)) {
		throw new Error('Invalid GitHub repository URL');
	}

	let ref = null;
	let subdirectory = null;
	if (parts.length > 2) {
		if (parts[2] !== 'tree' || !parts[3]) {
			throw new Error('Only supported GitHub repository and tree URLs may be used');
		}
		ref = decodePathPart(parts[3], 'GitHub ref');
		const subdirectoryParts = parts.slice(4).map((part) => decodePathPart(part, 'GitHub path'));
		subdirectory = subdirectoryParts.length === 0 ? null : subdirectoryParts.join('/');
	}

	return { kind: 'github', owner, repo, ref, subdirectory };
}

export function parseInput(rawInput) {
	if (typeof rawInput !== 'string' || !rawInput.trim()) {
		throw new Error('A package input is required');
	}
	const input = rawInput.trim();

	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
		const url = new URL(input);
		if (url.protocol !== 'https:') throw new Error('Remote inputs must use HTTPS');
		if (url.username || url.password || url.search || url.hash) {
			throw new Error(
				'Remote input URLs must not contain credentials, query parameters, or fragments',
			);
		}
		if (url.hostname === 'www.npmjs.com' || url.hostname === 'npmjs.com') return parseNpmUrl(url);
		if (url.hostname === 'github.com') return parseGitHubUrl(url);
		throw new Error(`The host ${url.hostname} is not supported`);
	}

	return parsePackageSpecifier(input);
}

function normalizeLicenseText(content) {
	return content
		.replace(/^\uFEFF/, '')
		.replace(/\r\n?/g, '\n')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

export function isRecognizableMitText(content) {
	if (typeof content !== 'string') return false;
	const text = normalizeLicenseText(content);
	return [
		'permission is hereby granted, free of charge, to any person obtaining a copy',
		'the above copyright notice and this permission notice shall be included in all copies or substantial portions of the software',
		'the software is provided "as is", without warranty of any kind',
		'in no event shall the authors or copyright holders be liable for any claim, damages or other liability',
	].every((phrase) => text.includes(phrase));
}

function sha256(content) {
	return createHash('sha256').update(content).digest('hex');
}

function blockLicense(reasons, evidence, notices) {
	return {
		status: 'blocked',
		spdx: null,
		reasons,
		evidence,
		notices,
		obligations: [],
	};
}

export function evaluateMitLicense({ manifestLicense, licenseFiles = [], noticeFiles = [] }) {
	const evidence = licenseFiles
		.map((file) => ({
			path: file.path,
			scope: file.scope ?? 'unspecified',
			classification: isRecognizableMitText(file.content) ? 'MIT' : 'unrecognized',
			sha256: sha256(file.content ?? ''),
		}))
		.sort((left, right) => left.path.localeCompare(right.path));
	const notices = noticeFiles
		.map((file) => ({
			path: file.path,
			scope: file.scope ?? 'unspecified',
			sha256: sha256(file.content ?? ''),
		}))
		.sort((left, right) => left.path.localeCompare(right.path));
	const reasons = [];

	if (typeof manifestLicense !== 'string' || !manifestLicense.trim()) {
		reasons.push('The package manifest does not declare a license.');
	} else if (manifestLicense === 'MIT') {
		// Exact SPDX metadata is required; expressions and aliases fail closed.
	} else {
		const referencedFile = /^SEE LICENSE IN (.+)$/i.exec(manifestLicense)?.[1];
		if (!referencedFile) {
			reasons.push(`The package manifest license is not exact MIT: ${manifestLicense}`);
		} else {
			const normalizedReference = path.posix.normalize(referencedFile).toLowerCase();
			const match = licenseFiles.find((file) => {
				const normalizedPath = path.posix.normalize(file.path).toLowerCase();
				return (
					normalizedPath === normalizedReference ||
					(file.scope === 'package' && normalizedPath.endsWith(`/${normalizedReference}`))
				);
			});
			if (!match || !isRecognizableMitText(match.content)) {
				reasons.push(
					`The referenced license file ${referencedFile} is missing or is not recognizable MIT text.`,
				);
			}
		}
	}

	if (licenseFiles.length === 0) {
		reasons.push('No license file was found in the applicable package scope.');
	} else {
		for (const item of evidence) {
			if (item.classification !== 'MIT') {
				reasons.push(`License evidence ${item.path} is not recognizable MIT text.`);
			}
		}
	}

	if (reasons.length > 0) return blockLicense(reasons, evidence, notices);
	return {
		status: 'passed',
		spdx: 'MIT',
		reasons: [],
		evidence,
		notices,
		obligations: [
			'Retain the upstream copyright and permission notice in all copies or substantial portions of the software.',
			...(notices.length > 0
				? ['Retain every applicable upstream NOTICE file and attribution in the completed binding.']
				: []),
		],
	};
}

function sameRepository(left, right) {
	return (
		left?.owner?.toLowerCase() === right?.owner?.toLowerCase() &&
		left?.repo?.toLowerCase() === right?.repo?.toLowerCase() &&
		(left?.subdirectory ?? null) === (right?.subdirectory ?? null)
	);
}

export function assessResolvedEvidence({ input, registry, source }) {
	const blockers = [];
	for (const [label, value] of [
		['published package', registry],
		['immutable source', source],
	]) {
		if (!value || typeof value !== 'object') blockers.push(`Missing ${label} evidence.`);
	}
	if (blockers.length > 0) {
		return {
			input,
			status: 'blocked',
			blockers,
			repair: 'Supply both published and source evidence.',
		};
	}

	if (registry.name !== source.name) {
		blockers.push(
			`Published package name ${registry.name} does not match source name ${source.name}.`,
		);
	}
	if (registry.version !== source.version) {
		blockers.push(
			`Published package version ${registry.version} does not match source version ${source.version}.`,
		);
	}
	if (!sameRepository(registry.repository, source.repository)) {
		blockers.push(
			'Published repository identity or package subdirectory does not match immutable source.',
		);
	}
	if (!/^[0-9a-f]{40}$/i.test(registry.gitHead ?? '')) {
		blockers.push('Published package metadata does not contain an immutable 40-character gitHead.');
	} else if (registry.gitHead.toLowerCase() !== source.commit?.toLowerCase()) {
		blockers.push(
			`Published gitHead ${registry.gitHead} does not match source commit ${source.commit}.`,
		);
	}
	if (typeof registry.integrity !== 'string' || !registry.integrity) {
		blockers.push('Published package artifact has no verified integrity identifier.');
	}

	const publishedLicense = evaluateMitLicense(registry);
	const sourceLicense = evaluateMitLicense(source);
	for (const [label, verdict] of [
		['Published artifact', publishedLicense],
		['Immutable source', sourceLicense],
	]) {
		if (verdict.status !== 'passed') {
			blockers.push(...verdict.reasons.map((reason) => `${label}: ${reason}`));
		}
	}

	const identity = {
		packageName: registry.name,
		version: registry.version,
		repository: registry.repository,
		commit: source.commit,
		integrity: registry.integrity,
	};
	const fingerprintInput = {
		identity,
		publishedLicense: {
			spdx: publishedLicense.spdx,
			evidence: publishedLicense.evidence,
			notices: publishedLicense.notices,
		},
		sourceLicense: {
			spdx: sourceLicense.spdx,
			evidence: sourceLicense.evidence,
			notices: sourceLicense.notices,
		},
	};

	return sanitizeForReport({
		input,
		status: blockers.length === 0 ? 'licensed' : 'blocked',
		identity,
		license: {
			policy: 'exact-mit-v1',
			published: publishedLicense,
			source: sourceLicense,
			obligations:
				blockers.length === 0
					? [...new Set([...publishedLicense.obligations, ...sourceLicense.obligations])]
					: [],
			disclaimer: 'Repository policy check only; not legal advice.',
		},
		blockers,
		repair:
			blockers.length === 0
				? null
				: 'Resolve every identity conflict and supply exact MIT evidence without overriding the policy gate.',
		evidenceFingerprint: fingerprint(fingerprintInput),
	});
}

export function verifyIntegrity(bytes, integrity) {
	if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
		throw new TypeError('Artifact bytes must be a Buffer or Uint8Array');
	}
	if (typeof integrity !== 'string' || !integrity.trim()) {
		throw new Error('Registry artifact integrity is required');
	}

	const declarations = integrity
		.trim()
		.split(/\s+/)
		.map((declaration) => {
			const match = /^(sha(?:256|384|512))-([A-Za-z0-9+/]+={0,2})(?:\?.*)?$/.exec(declaration);
			return match ? { algorithm: match[1], digest: match[2] } : null;
		})
		.filter(Boolean);
	const selected = SUPPORTED_INTEGRITY_ALGORITHMS.map((algorithm) =>
		declarations.find((declaration) => declaration.algorithm === algorithm),
	).find(Boolean);
	if (!selected) throw new Error('Registry artifact integrity uses no supported algorithm');

	const expected = Buffer.from(selected.digest, 'base64');
	const actual = createHash(selected.algorithm).update(bytes).digest();
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
		throw new Error('Registry artifact integrity mismatch');
	}
	return { algorithm: selected.algorithm, digest: selected.digest };
}

function validateArchivePath(entryPath, maxDepth) {
	if (
		typeof entryPath !== 'string' ||
		!entryPath ||
		entryPath.includes('\0') ||
		entryPath.includes('\\') ||
		path.posix.isAbsolute(entryPath)
	) {
		throw new Error(`Unsafe archive path: ${String(entryPath)}`);
	}
	const parts = entryPath.split('/').filter(Boolean);
	if (
		parts.length === 0 ||
		parts.length > maxDepth ||
		parts.some((part) => part === '.' || part === '..')
	) {
		throw new Error(`Unsafe archive path: ${entryPath}`);
	}
	return parts;
}

export function validateArchiveEntries(entries, limits = {}) {
	if (!Array.isArray(entries)) throw new TypeError('Archive entries must be an array');
	const resolvedLimits = { ...DEFAULT_ARCHIVE_LIMITS, ...limits };
	let fileCount = 0;
	let totalBytes = 0;

	for (const entry of entries) {
		validateArchivePath(entry.path, resolvedLimits.maxDepth);
		if (entry.type === 'directory') continue;
		if (entry.type !== 'file') throw new Error(`Unsupported archive entry type: ${entry.type}`);
		if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
			throw new Error(`Invalid archive entry size: ${entry.path}`);
		}
		if (entry.size > resolvedLimits.maxFileBytes) {
			throw new Error(`Archive entry exceeds the per-file limit: ${entry.path}`);
		}
		fileCount += 1;
		totalBytes += entry.size;
		if (fileCount > resolvedLimits.maxFiles || totalBytes > resolvedLimits.maxTotalBytes) {
			throw new Error('Archive exceeds resource limits');
		}
	}

	return { fileCount, totalBytes };
}

function readTarString(header, start, length) {
	const end = header.indexOf(0, start);
	const boundedEnd = end === -1 || end > start + length ? start + length : end;
	return header.subarray(start, boundedEnd).toString('utf8').trim();
}

function readTarOctal(header, start, length, label) {
	const value = readTarString(header, start, length).trim();
	if (!/^[0-7]+$/.test(value)) throw new Error(`Invalid archive ${label}`);
	const parsed = Number.parseInt(value, 8);
	if (!Number.isSafeInteger(parsed)) throw new Error(`Archive ${label} is too large`);
	return parsed;
}

function verifyTarHeaderChecksum(header) {
	const expected = readTarOctal(header, 148, 8, 'header checksum');
	let actual = 0;
	for (let index = 0; index < header.length; index += 1) {
		actual += index >= 148 && index < 156 ? 0x20 : header[index];
	}
	if (actual !== expected) throw new Error('Archive header checksum mismatch');
}

export function parseTarArchive(bytes, { select = () => false, limits = {} } = {}) {
	if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
		throw new TypeError('Archive bytes must be a Buffer or Uint8Array');
	}
	const archive = Buffer.from(bytes);
	const entries = [];
	const files = new Map();
	let offset = 0;

	while (offset + 512 <= archive.length) {
		const header = archive.subarray(offset, offset + 512);
		if (header.every((byte) => byte === 0)) break;
		verifyTarHeaderChecksum(header);

		const name = readTarString(header, 0, 100);
		const prefix = readTarString(header, 345, 155);
		const entryPath = prefix ? `${prefix}/${name}` : name;
		const size = readTarOctal(header, 124, 12, 'entry size');
		const typeFlag = readTarString(header, 156, 1);
		const type =
			typeFlag === '' || typeFlag === '0' ? 'file' : typeFlag === '5' ? 'directory' : 'link';
		const entry = { path: entryPath, type, size };
		validateArchiveEntries([entry], limits);

		const dataStart = offset + 512;
		const dataEnd = dataStart + size;
		if (dataEnd > archive.length) throw new Error(`Archive entry is truncated: ${entryPath}`);
		entries.push(entry);
		if (type === 'file' && select(entryPath, entry)) {
			files.set(entryPath, Buffer.from(archive.subarray(dataStart, dataEnd)));
		}
		offset = dataStart + Math.ceil(size / 512) * 512;
	}

	validateArchiveEntries(entries, limits);
	return { entries, files };
}

async function readBoundedBody(response, maxBytes) {
	const declaredLength = Number(response.headers.get('content-length'));
	if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
		throw new Error(`Remote response exceeds the ${maxBytes}-byte limit`);
	}
	if (!response.body) return Buffer.alloc(0);

	const chunks = [];
	let totalBytes = 0;
	for await (const chunk of response.body) {
		const bytes = Buffer.from(chunk);
		totalBytes += bytes.length;
		if (totalBytes > maxBytes) {
			if (typeof response.body.cancel === 'function') await response.body.cancel().catch(() => {});
			throw new Error(`Remote response exceeds the ${maxBytes}-byte limit`);
		}
		chunks.push(bytes);
	}
	return Buffer.concat(chunks, totalBytes);
}

async function fetchBounded(
	initialUrl,
	{ fetchImpl, allowedHosts, maxBytes, headers = {}, redirects = REMOTE_LIMITS.redirects },
) {
	let currentUrl = new URL(initialUrl);
	for (let redirectCount = 0; redirectCount <= redirects; redirectCount += 1) {
		if (currentUrl.protocol !== 'https:' || !allowedHosts.has(currentUrl.hostname)) {
			throw new Error(`Remote URL is outside the allowed HTTPS hosts: ${currentUrl.hostname}`);
		}
		const response = await fetchImpl(currentUrl, {
			method: 'GET',
			redirect: 'manual',
			headers: {
				'user-agent': 'octane-react-port-preflight/1',
				...headers,
			},
		});
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location || redirectCount === redirects)
				throw new Error('Remote redirect limit exceeded');
			currentUrl = new URL(location, currentUrl);
			continue;
		}
		if (!response.ok) throw new Error(`Remote request failed with HTTP ${response.status}`);
		return { bytes: await readBoundedBody(response, maxBytes), finalUrl: currentUrl.toString() };
	}
	throw new Error('Remote redirect limit exceeded');
}

async function fetchJson(url, options) {
	const { bytes } = await fetchBounded(url, {
		...options,
		maxBytes: options.maxBytes ?? REMOTE_LIMITS.jsonBytes,
	});
	try {
		return JSON.parse(bytes.toString('utf8'));
	} catch {
		throw new Error('Remote response was not valid JSON');
	}
}

function normalizeRepository(repository) {
	const repositoryUrl = typeof repository === 'string' ? repository : repository?.url;
	if (typeof repositoryUrl !== 'string')
		throw new Error('Package metadata has no GitHub repository URL');
	let value = repositoryUrl.trim();
	if (value.startsWith('github:')) value = `https://github.com/${value.slice('github:'.length)}`;
	if (value.startsWith('git+')) value = value.slice(4);
	if (value.startsWith('git://github.com/'))
		value = `https://github.com/${value.slice('git://github.com/'.length)}`;
	if (value.startsWith('git@github.com:'))
		value = `https://github.com/${value.slice('git@github.com:'.length)}`;
	if (value.startsWith('ssh://git@github.com/')) {
		value = `https://github.com/${value.slice('ssh://git@github.com/'.length)}`;
	}
	const parsed = new URL(value);
	if (
		parsed.protocol !== 'https:' ||
		parsed.hostname !== 'github.com' ||
		parsed.username ||
		parsed.password ||
		parsed.search ||
		parsed.hash
	) {
		throw new Error('Only public GitHub source repositories are supported');
	}
	const normalized = parseGitHubUrl(parsed);
	if (normalized.ref || normalized.subdirectory)
		throw new Error('Package repository metadata must identify the repository root');

	let subdirectory = typeof repository === 'object' ? (repository.directory ?? null) : null;
	if (subdirectory !== null) {
		if (typeof subdirectory !== 'string')
			throw new Error('Package repository.directory must be a string');
		const parts = subdirectory
			.split('/')
			.map((part) => decodePathPart(part, 'repository directory'));
		subdirectory = parts.join('/');
	}
	return { owner: normalized.owner, repo: normalized.repo, subdirectory };
}

function parseJsonFile(bytes, label) {
	try {
		return JSON.parse(bytes.toString('utf8'));
	} catch {
		throw new Error(`${label} is not valid JSON`);
	}
}

function archiveEvidencePath(relativePath) {
	return `package/${relativePath.replace(/^\.\//, '')}`;
}

function isStandardEvidencePath(entryPath) {
	if (!entryPath.startsWith('package/')) return false;
	const relativePath = entryPath.slice('package/'.length);
	return (
		!relativePath.includes('/') &&
		(LICENSE_NAME_PATTERN.test(relativePath) || NOTICE_NAME_PATTERN.test(relativePath))
	);
}

function collectArchiveEvidence(archiveBytes) {
	const uncompressed = gunzipSync(archiveBytes, {
		maxOutputLength: REMOTE_LIMITS.expandedArtifactBytes,
	});
	let parsed = parseTarArchive(uncompressed, {
		select: (entryPath, entry) =>
			entry.size <= REMOTE_LIMITS.licenseBytes &&
			(entryPath === 'package/package.json' || isStandardEvidencePath(entryPath)),
	});
	const manifestBytes = parsed.files.get('package/package.json');
	if (!manifestBytes) throw new Error('Published artifact has no package/package.json');
	const manifest = parseJsonFile(manifestBytes, 'Published package manifest');
	const reference = /^SEE LICENSE IN (.+)$/i.exec(manifest.license ?? '')?.[1];
	if (reference) {
		const referencePath = archiveEvidencePath(reference);
		if (!parsed.files.has(referencePath)) {
			parsed = parseTarArchive(uncompressed, {
				select: (entryPath, entry) =>
					entry.size <= REMOTE_LIMITS.licenseBytes &&
					(entryPath === 'package/package.json' ||
						isStandardEvidencePath(entryPath) ||
						entryPath === referencePath),
			});
		}
	}

	const licenseFiles = [];
	const noticeFiles = [];
	for (const [entryPath, bytes] of parsed.files) {
		if (entryPath === 'package/package.json') continue;
		const file = { path: entryPath, scope: 'package', content: bytes.toString('utf8') };
		if (NOTICE_NAME_PATTERN.test(path.posix.basename(entryPath))) noticeFiles.push(file);
		else licenseFiles.push(file);
	}
	return { manifest, manifestBytes, licenseFiles, noticeFiles };
}

function mergeRuntimeDependencies(manifest) {
	return Object.fromEntries(
		Object.entries(manifest.dependencies ?? {}).sort(([left], [right]) =>
			left.localeCompare(right),
		),
	);
}

async function resolveRegistryArtifact(packageName, selector, options) {
	const registryHeaders = { accept: 'application/vnd.npm.install-v1+json' };
	if (options.npmToken) registryHeaders.authorization = `Bearer ${options.npmToken}`;
	const packumentUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
	const packument = await fetchJson(packumentUrl, {
		fetchImpl: options.fetchImpl,
		allowedHosts: new Set(['registry.npmjs.org']),
		headers: registryHeaders,
	});
	const requestedSelector = selector ?? 'latest';
	const exactVersion = packument.versions?.[requestedSelector]
		? requestedSelector
		: packument['dist-tags']?.[requestedSelector];
	if (!exactVersion || !packument.versions?.[exactVersion]) {
		throw new Error(`Selector ${requestedSelector} did not resolve to one exact published version`);
	}
	const metadata = packument.versions[exactVersion];
	if (metadata.name !== packageName || metadata.version !== exactVersion) {
		throw new Error('Registry package identity contradicts the requested package');
	}
	if (!metadata.dist?.tarball || !metadata.dist?.integrity) {
		throw new Error('Registry metadata lacks tarball integrity evidence');
	}
	const artifact = await fetchBounded(metadata.dist.tarball, {
		fetchImpl: options.fetchImpl,
		allowedHosts: new Set(['registry.npmjs.org']),
		maxBytes: REMOTE_LIMITS.artifactBytes,
		headers: registryHeaders,
	});
	verifyIntegrity(artifact.bytes, metadata.dist.integrity);
	const contents = collectArchiveEvidence(artifact.bytes);
	if (contents.manifest.name !== metadata.name || contents.manifest.version !== metadata.version) {
		throw new Error('Published artifact identity contradicts registry metadata');
	}
	const metadataRepository = normalizeRepository(metadata.repository);
	const artifactRepository = normalizeRepository(contents.manifest.repository);
	if (!sameRepository(metadataRepository, artifactRepository)) {
		throw new Error('Published artifact repository metadata contradicts registry metadata');
	}
	if (metadata.license !== contents.manifest.license) {
		throw new Error('Published artifact license metadata contradicts registry metadata');
	}

	return {
		name: contents.manifest.name,
		version: contents.manifest.version,
		repository: metadataRepository,
		gitHead: metadata.gitHead,
		integrity: metadata.dist.integrity,
		manifestLicense: contents.manifest.license,
		licenseFiles: contents.licenseFiles,
		noticeFiles: contents.noticeFiles,
		manifestSha256: sha256(contents.manifestBytes),
		artifactUrl: artifact.finalUrl,
		runtimeDependencies: mergeRuntimeDependencies(contents.manifest),
	};
}

function githubHeaders(options) {
	const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
	if (options.githubToken) headers.authorization = `Bearer ${options.githubToken}`;
	return headers;
}

async function fetchGitHubBlob(entry, options) {
	if (entry.size > REMOTE_LIMITS.licenseBytes)
		throw new Error(`Source evidence file is too large: ${entry.path}`);
	const response = await fetchJson(entry.url, {
		fetchImpl: options.fetchImpl,
		allowedHosts: new Set(['api.github.com']),
		maxBytes: Math.min(REMOTE_LIMITS.jsonBytes, REMOTE_LIMITS.licenseBytes * 2),
		headers: githubHeaders(options),
	});
	if (response.encoding !== 'base64' || typeof response.content !== 'string') {
		throw new Error(`GitHub blob is not inline base64 evidence: ${entry.path}`);
	}
	const bytes = Buffer.from(response.content.replace(/\s/g, ''), 'base64');
	if (
		bytes.length !== entry.size ||
		(response.size !== undefined && response.size !== bytes.length)
	) {
		throw new Error(`GitHub blob size does not match tree evidence: ${entry.path}`);
	}
	return bytes;
}

function applicableSourceEvidence(entryPath, subdirectory) {
	const directory = path.posix.dirname(entryPath);
	const basename = path.posix.basename(entryPath);
	return (
		(directory === '.' || directory === (subdirectory ?? '.')) &&
		(LICENSE_NAME_PATTERN.test(basename) || NOTICE_NAME_PATTERN.test(basename))
	);
}

async function resolveGitHubSource(repository, ref, options) {
	const apiRoot = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
	const commitResponse = await fetchJson(
		`${apiRoot}/commits/${encodeURIComponent(ref ?? 'HEAD')}`,
		{
			fetchImpl: options.fetchImpl,
			allowedHosts: new Set(['api.github.com']),
			headers: githubHeaders(options),
		},
	);
	if (!/^[0-9a-f]{40}$/i.test(commitResponse.sha ?? ''))
		throw new Error('GitHub did not resolve an immutable commit');
	const commit = commitResponse.sha.toLowerCase();
	const treeSha = commitResponse.commit?.tree?.sha?.toLowerCase();
	if (!/^[0-9a-f]{40}$/i.test(treeSha ?? ''))
		throw new Error('GitHub commit has no immutable root tree');
	const treeResponse = await fetchJson(`${apiRoot}/git/trees/${treeSha}?recursive=1`, {
		fetchImpl: options.fetchImpl,
		allowedHosts: new Set(['api.github.com']),
		maxBytes: REMOTE_LIMITS.jsonBytes,
		headers: githubHeaders(options),
	});
	if (treeResponse.truncated) throw new Error('GitHub returned truncated source-tree evidence');
	if (treeResponse.sha?.toLowerCase() !== treeSha || !Array.isArray(treeResponse.tree)) {
		throw new Error('GitHub source tree does not match the resolved commit');
	}
	if (treeResponse.tree.length > 50_000)
		throw new Error('GitHub source tree exceeds the entry limit');
	const sourceEntries = treeResponse.tree.map((entry) => ({
		path: entry.path,
		type:
			entry.type === 'tree'
				? 'directory'
				: entry.type === 'blob' && entry.mode !== '120000'
					? 'file'
					: 'link',
		size: entry.size ?? 0,
	}));
	validateArchiveEntries(sourceEntries, { maxFiles: 50_000 });

	const manifestPath = repository.subdirectory
		? `${repository.subdirectory}/package.json`
		: 'package.json';
	const manifestEntry = treeResponse.tree.find(
		(entry) => entry.path === manifestPath && entry.type === 'blob',
	);
	if (!manifestEntry) throw new Error(`Immutable source has no ${manifestPath}`);
	const manifestBytes = await fetchGitHubBlob(manifestEntry, options);
	const manifest = parseJsonFile(manifestBytes, 'Immutable source manifest');
	if (manifest.repository) {
		const sourceManifestRepository = normalizeRepository(manifest.repository);
		if (!sameRepository(repository, sourceManifestRepository)) {
			throw new Error('Immutable source manifest repository contradicts the requested repository');
		}
	}

	const candidates = treeResponse.tree.filter(
		(entry) =>
			entry.type === 'blob' && applicableSourceEvidence(entry.path, repository.subdirectory),
	);
	const reference = /^SEE LICENSE IN (.+)$/i.exec(manifest.license ?? '')?.[1];
	if (reference) {
		const referencePath = path.posix.normalize(
			repository.subdirectory ? `${repository.subdirectory}/${reference}` : reference,
		);
		if (referencePath.startsWith('../') || path.posix.isAbsolute(referencePath)) {
			throw new Error('Immutable source manifest references a license outside the repository');
		}
		const referencedEntry = treeResponse.tree.find(
			(entry) => entry.path === referencePath && entry.type === 'blob',
		);
		if (referencedEntry && !candidates.includes(referencedEntry)) candidates.push(referencedEntry);
	}

	const licenseFiles = [];
	const noticeFiles = [];
	for (const entry of candidates.sort((left, right) => left.path.localeCompare(right.path))) {
		const bytes = await fetchGitHubBlob(entry, options);
		const file = {
			path: entry.path,
			scope:
				path.posix.dirname(entry.path) === (repository.subdirectory ?? '.') ? 'package' : 'root',
			content: bytes.toString('utf8'),
			gitBlob: entry.sha,
		};
		if (NOTICE_NAME_PATTERN.test(path.posix.basename(entry.path))) noticeFiles.push(file);
		else licenseFiles.push(file);
	}

	return {
		name: manifest.name,
		version: manifest.version,
		repository,
		commit,
		manifestLicense: manifest.license,
		licenseFiles,
		noticeFiles,
		manifestSha256: sha256(manifestBytes),
	};
}

export async function resolveRemoteInput(parsedInput, rawInput, options = {}) {
	const resolvedOptions = { fetchImpl: globalThis.fetch, ...options };
	if (typeof resolvedOptions.fetchImpl !== 'function')
		throw new Error('No fetch implementation is available');

	let registry;
	let source;
	if (parsedInput.kind === 'npm') {
		registry = await resolveRegistryArtifact(
			parsedInput.packageName,
			parsedInput.selector,
			resolvedOptions,
		);
		source = await resolveGitHubSource(registry.repository, registry.gitHead, resolvedOptions);
	} else {
		const repository = {
			owner: parsedInput.owner,
			repo: parsedInput.repo,
			subdirectory: parsedInput.subdirectory,
		};
		source = await resolveGitHubSource(repository, parsedInput.ref, resolvedOptions);
		if (!source.name || !source.version) {
			throw new Error('GitHub source package is not an exact published package identity');
		}
		registry = await resolveRegistryArtifact(source.name, source.version, resolvedOptions);
	}
	const result = assessResolvedEvidence({ input: rawInput, registry, source });
	return {
		...result,
		runtimeDependencies: registry.runtimeDependencies,
		provenance: sanitizeForReport({
			registryManifestSha256: registry.manifestSha256,
			sourceManifestSha256: source.manifestSha256,
			artifactUrl: registry.artifactUrl,
		}),
	};
}

function sanitizeUrl(value) {
	let url;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	url.username = '';
	url.password = '';
	const parameters = [...url.searchParams.entries()]
		.map(([key, parameterValue]) => [
			key,
			SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : parameterValue,
		])
		.sort(([left], [right]) => left.localeCompare(right));
	url.search = '';
	for (const [key, parameterValue] of parameters) url.searchParams.append(key, parameterValue);
	return url.toString();
}

export function sanitizeForReport(value, key = '') {
	if (SENSITIVE_KEY_PATTERN.test(key)) return '[REDACTED]';
	if (Array.isArray(value)) return value.map((item) => sanitizeForReport(item));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([entryKey, entryValue]) => [
				entryKey,
				sanitizeForReport(entryValue, entryKey),
			]),
		);
	}
	if (typeof value === 'string') {
		const sanitizedUrl = sanitizeUrl(value);
		if (sanitizedUrl) return sanitizedUrl;
		SENSITIVE_VALUE_PATTERN.lastIndex = 0;
		if (SENSITIVE_VALUE_PATTERN.test(value)) {
			SENSITIVE_VALUE_PATTERN.lastIndex = 0;
			return value.replace(SENSITIVE_VALUE_PATTERN, '[REDACTED]');
		}
	}
	return value;
}

export function stableStringify(value) {
	function sort(item) {
		if (Array.isArray(item)) return item.map(sort);
		if (item && typeof item === 'object') {
			return Object.fromEntries(
				Object.keys(item)
					.sort()
					.map((key) => [key, sort(item[key])]),
			);
		}
		return item;
	}
	return JSON.stringify(sort(value));
}

export function fingerprint(value) {
	return sha256(stableStringify(value));
}

export async function runPreflight({ inputs, resolve, onReady = async () => {} }) {
	if (!Array.isArray(inputs) || inputs.length === 0)
		throw new Error('At least one package input is required');
	if (typeof resolve !== 'function') throw new TypeError('A preflight resolver is required');

	const targets = [];
	for (const input of inputs) {
		try {
			const parsedInput = parseInput(input);
			const result = sanitizeForReport(await resolve(parsedInput, input));
			targets.push({ input, ...result });
			if (result.status === 'licensed') await onReady(result);
		} catch (error) {
			targets.push({
				input,
				status: 'blocked',
				blockers: [sanitizeForReport(error instanceof Error ? error.message : String(error))],
				repair: 'Correct the input or retry after supplying the missing immutable evidence.',
			});
		}
	}

	const blocked = targets.filter((target) => target.status === 'blocked').length;
	return {
		schemaVersion: 1,
		status: blocked === targets.length ? 'blocked' : blocked > 0 ? 'partial' : 'passed',
		targets,
	};
}
