import react from '@vitejs/plugin-react';
import { octane } from '@octanejs/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react(), octane({ requireDirective: true })],
});
