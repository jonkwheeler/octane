import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { octane } from '@octanejs/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tanstackStart(), octane({ requireDirective: true }), react()],
});
