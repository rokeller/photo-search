import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: true,
        proxy: {
            '/.auth': 'http://localhost:8080/',
            '/api': 'http://localhost:8080/',
        },
    },
    build: {
        rolldownOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                redirect: resolve(import.meta.dirname, 'sso-redirect.html'),
            },
            output: {
                codeSplitting: {
                    minSize: 20000,
                    groups: [
                        {
                            name: 'react-vendor',
                            test: /node_modules[\\/]react/,
                            priority: 20, // higher means higher priority
                        },
                        {
                            name: 'ui-vendor',
                            test: /node_modules[\\/](@emotion|@mui)/,
                            priority: 15,
                        },
                        {
                            name: 'vendor',
                            test: /node_modules/,
                            priority: 10,
                        },
                        {
                            name: 'common',
                            minShareCount: 2,
                            minSize: 10000,
                            priority: 5,
                        },
                    ],
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
});
