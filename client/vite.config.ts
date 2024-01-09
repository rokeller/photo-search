import react from '@vitejs/plugin-react';
import { UserConfig, defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    let base = '/dist';
    const mergeConfig: UserConfig = {};

    if (command === 'serve') {
        base = '/';
        mergeConfig.server = {
            host: true,
            proxy: {
                '/.well-known': 'http://localhost:8080/',
                '/api': 'http://localhost:8080/',
            }
        };
    }

    return {
        ...mergeConfig,
        base,
        plugins: [react()],
    }
});
