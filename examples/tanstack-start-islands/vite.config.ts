import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig, octane } from '@octanejs/vite-plugin';

export default defineConfig({
	plugins: [tanstackStart(), octane({ requireDirective: true }), react()],
});
