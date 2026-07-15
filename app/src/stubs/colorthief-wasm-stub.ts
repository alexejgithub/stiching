// colorthief/internals' WasmQuantizer.init() dynamically imports a wasm
// build that colorthief ships instructions for but not the built artifact
// itself. Vite's import-analysis eagerly resolves that static import()
// specifier at transform time (to make it a valid dev-server URL) even
// though this app never calls WasmQuantizer.init() - we only use the
// pure-TS MmcqQuantizer. vite.config.ts aliases the broken specifier to
// this empty stub so the transform succeeds; the stub itself is never
// evaluated in practice.
export default undefined;
