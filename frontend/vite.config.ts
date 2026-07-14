import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Keep the CRA-era env var names so .env files stay unchanged.
    envPrefix: ['VITE_', 'REACT_APP_'],
    server: {
        port: 3000,
    },
    build: {
        // CRA used build/; the deploy scripts rely on it.
        outDir: 'build',
    },
});
