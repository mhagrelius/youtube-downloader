import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/electron/**/*.test.ts'],
    exclude: ['e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['electron/**/*.ts'],
      exclude: ['**/*.d.ts', 'electron/main.ts', 'electron/preload.ts'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
