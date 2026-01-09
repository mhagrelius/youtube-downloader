import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron'

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      ...(isElectron
        ? [
            electron({
              main: {
                entry: 'electron/main.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron', 'better-sqlite3'],
                    },
                    minify: false,
                  },
                },
              },
              preload: {
                input: 'electron/preload.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron'],
                      output: {
                        inlineDynamicImports: true,
                      },
                    },
                    minify: false,
                  },
                },
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
