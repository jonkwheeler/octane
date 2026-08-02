import * as reactTiptap from '@tiptap/react';
import * as reactMenus from '@tiptap/react/menus';
import * as octaneTiptap from '@octanejs/tiptap';
import * as octaneMenus from '@octanejs/tiptap/menus';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

function publicNames(module: Record<string, unknown>): string[] {
	return Object.keys(module).sort();
}

describe('@octanejs/tiptap public module surface', () => {
	// OCTANE DIVERGENCE[tiptap-native-external-store][adapted:tiptap-native-external-store]
	// @parity-case adapted:tiptap-native-external-store
	it('does not publish React or use-sync-external-store dependencies', () => {
		expect(packageJson.dependencies).not.toHaveProperty('react');
		expect(packageJson.dependencies).not.toHaveProperty('use-sync-external-store');
	});
	it('matches the @tiptap/react 3.28 root runtime exports', () => {
		expect(publicNames(octaneTiptap)).toEqual(publicNames(reactTiptap));
	});

	it('matches the @tiptap/react 3.28 menus runtime exports', () => {
		expect(publicNames(octaneMenus)).toEqual(publicNames(reactMenus));
	});
});
