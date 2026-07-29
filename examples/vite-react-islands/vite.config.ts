import react from '@vitejs/plugin-react';
import { defineConfig, octane } from '@octanejs/vite-plugin';

export default defineConfig({
	plugins: [react(), octane()],
});
