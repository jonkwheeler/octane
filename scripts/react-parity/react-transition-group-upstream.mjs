#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyReactTransitionGroupUpstream } from './react-transition-group-upstream-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const summary = verifyReactTransitionGroupUpstream(root);
console.log(
	`react-transition-group upstream verified: ${summary.artifacts} artifacts, ${summary.cases} cases`,
);
