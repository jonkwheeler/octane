'use client';

import { OctaneCompat } from 'octane/react';
import { MigratedRichTextEditor } from './migrated-rich-text-editor';

export function TiptapIsland() {
	return <OctaneCompat component={MigratedRichTextEditor} />;
}
