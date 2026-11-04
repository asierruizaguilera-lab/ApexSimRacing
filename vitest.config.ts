import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src'), 'server-only': path.resolve(__dirname, './src/lib/mail/__tests__/empty.ts') } },
  test: { environment: 'node' },
})
