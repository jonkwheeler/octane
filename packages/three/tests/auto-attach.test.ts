import { create } from '@octanejs/three/testing';
import { describe, expect, it } from 'vitest';
import { AutoAttachArrayScene } from './_fixtures/auto-attach.three.tsrx';

describe('renderer-owned array attachment', () => {
	it('attaches unplaced children in authored order and detaches their slots on teardown', async () => {
		const parent = { passes: [] as object[] };
		const first = { name: 'first' };
		const second = { name: 'second' };
		const root = await create(AutoAttachArrayScene, { parent, first, second });

		expect(parent.passes).toEqual([first, second]);
		root.unmount();
		expect(parent.passes).toEqual([undefined, undefined]);
	});
});
