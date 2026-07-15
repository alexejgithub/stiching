/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // colorthief/internals' WasmQuantizer.init() has a static
      // import("../../dist/wasm/color_thief_wasm.js") that colorthief never
      // actually ships (it's an opt-in build step colorthief's own docs
      // describe, not part of the published package). Vite's import-analysis
      // eagerly resolves every static import() specifier at transform time
      // to rewrite it into a dev-server URL, even for code paths that are
      // never executed - so it fails on this file's absence even though
      // this app only uses the pure-TS MmcqQuantizer and never calls
      // WasmQuantizer.init(). Redirect the exact broken specifier to a
      // real (empty, never-evaluated) stub so the transform succeeds.
      { find: /\.\.\/\.\.\/dist\/wasm\/color_thief_wasm\.js$/, replacement: fileURLToPath(new URL('./src/stubs/colorthief-wasm-stub.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
