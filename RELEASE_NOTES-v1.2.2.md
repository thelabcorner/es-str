# v1.2.2 — 2026-09-23

SemVer: patch — internal ABI and build-tooling migration. No public JS API change and no trim-semantics change.

## Changed

- Native ABI now comes from the pinned ESABI v0.3.0 submodule (`deps/esabi` @ `3e99040c43cef573b477ad372b2a3a96c4d3a7d7`); `native/SoSharedLibDefs.h` is removed. `ESSTRTrim.dll` exports are unchanged (`ESInitialize`, `ESGetVersion`, `ESFreeMem`, `ESTerminate`, `trim`, `trimLeft`, `trimRight`, `ping`, `version`) and are now declared through `ESABI_DIRECT_FUNCTION` / `ESABI_INITIALIZE_FUNCTION` / `ESABI_FREE_FUNCTION`.
- JSX artifacts are built through the shared ESTC pipeline (`extendscript*.estc.config.mjs`): ES3 normalization, bundle-local esbuild-helper localization, strict-directive stripping and the static ES3 gate. The hand-rolled `Function.prototype.bind` shim and `"use strict"` stripping are gone.
- `dist/ESSTR.facade.jsx` is now an ESTC-built, ESTC-checked artifact (facade + ESPAK adapter).
- Removed the stale embedded `ESCHARS_ACCEL_BUNDLE` eval lane; ESCHARS resolves from `$.global` or `ESPAK.load("ESChars")`.
- Builds write only inside this repository; vendoring the accel artifacts into the COM skill is an explicit integration step (`npm run release:integration`), not a build side effect.
- New gates: `npm run verify`, `npm run release:gate`, `npm run release:integration`.

## Verification

- `npm run release:gate`: exit 0 — the full sequence below, in one run.
- `npm run typecheck`: clean.
- `npm run build:accel`: all seven artifacts ESTC-built; `ESSTR.facade.jsx`, `ESSTR.accel.jsx`, `ESSTR.accel.min.jsx` statically checked.
- `npm test`: 20,059 checks passed (47 vectors + 20,000 differential + 9 coercion); native trim parity OK.
- `npm run fuzz`: 200,000 seeded differential iterations, 0 divergences (seed 31337).
- `npm run estc:static`: 7/7 artifacts PASS (`acorn-ecma3`).
- `npm run estc:live-parse`: 7/7 artifacts parsed live on Illustrator 30.6.0 / ExtendScript 4.5.6.
- `npm run live-verify`: 47/47 vectors + wrapper semantics verified in the live engine.
- `npm run live-verify:accel`: merged accel smoke passed (ESSTR native gate enabled, ESCHARS fallback route checks passed).
- `npm run native-build && npm run native-verify`: x64 PE, deterministic timestamp, NX/ASLR, 9 exports, no CRT imports, SHA-256 `DE962E40…`, ESPACK manifest payload byte-identical.

## Release Assets

- `vendor-esstr-runtime.js`
- `vendor-esstr.js`
- `ESSTR.jsx`
- `esstr-core.esm.mjs`
- `ESSTRTrim.dll`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`
