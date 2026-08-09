import { describe, expect, it } from 'vitest';
import { renderToString } from 'octane/server';
import * as binding from '../../src/index.ts';
import { ServerGroup, ServerTransition } from '../_fixtures/server.tsrx';

describe('react-transition-group v4.4.5 server rendering', () => {
	// Per path: packages/react-transition-group/upstream/test/SSR-test.js:8-10
	it('should import react-transition-group in node env', function importInNode() {
		expect(binding.Transition).toBeTypeOf('function');
		expect(binding.CSSTransition).toBeTypeOf('function');
		expect(binding.TransitionGroup).toBeTypeOf('function');
	});

	// @parity-case ssr:transition-initial-state
	it('renders the initial transition state without running effects', () => {
		expect(renderToString(ServerTransition).html).toContain('id="server-state">entered</span>');
	});

	// @parity-case ssr:transition-group-wrapper
	it('renders TransitionGroup wrapper and children', () => {
		const html = renderToString(ServerGroup).html;
		expect(html).toContain('<section id="server-group">');
		expect(html).toContain('id="server-child">child</span>');
	});
});
