import react from '@vitejs/plugin-react';
import { UserConfig, defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    const mergeConfig: UserConfig = {};

    if (command === 'serve') {
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

        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.indexOf('@mui') >= 0) {
                            return 'mui';
                        }
                        if (id.indexOf('react') >= 0) {
                            return 'react';
                        }
                        if (id.indexOf('node_modules') >= 0) {
                            return 'vendor';
                        }
                    },
                },
            },
        },

        plugins: [
            react(),
            ViteImageOptimizer({
                test: /\.svg$/i,
            }),
        ],
    }
});
