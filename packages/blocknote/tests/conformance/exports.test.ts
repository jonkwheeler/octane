import { describe, expect, it } from 'vitest';
import * as BlockNote from '@octanejs/blocknote';

describe('@octanejs/blocknote — exports', () => {
	it('exports milestone-1 editor bootstrap symbols', () => {
		expect(typeof BlockNote.useCreateBlockNote).toBe('function');
		expect(typeof BlockNote.useBlockNoteEditor).toBe('function');
		expect(typeof BlockNote.useBlockNoteContext).toBe('function');
		expect(BlockNote.BlockNoteContext).toBeTruthy();
	});

	it.todo('exports BlockNoteViewRaw once upstream .js import paths are normalized');
	it.todo('matches the full @blocknote/react 0.53 public surface');
});
