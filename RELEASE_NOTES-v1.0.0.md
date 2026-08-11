# v1.0.0 — 2026-08-10

SemVer: major (first public GitHub release).

First GitHub release of ESSTR, the String whitespace-method polyfill for Adobe ExtendScript ES3.

## Added

- Modern-trim-exact `trim`, `trimLeft`, `trimRight`, `trimStart`, and `trimEnd` facade methods and prototype gap-fill wrappers.
- JSX release builds: `ESSTR.jsx`, `vendor-esstr.js`, and `vendor-esstr-runtime.js`.
- Node ESM release build: `esstr-core.esm.mjs`.
- Windows x64 ExternalObject accelerator payload: `ESSTRTrim.dll`.
- ESPACK self-extracting accelerator bundles: `ESSTR.accel.jsx` and `ESSTR.accel.min.jsx`.

## Verification

Gate: 20,059 Node assertions / 200k fuzz vs Node natives / 47/47 live vectors, Illustrator 30.6.0 / ESSTRTrim live probe / ESSTR.accel live smoke. All green on this working tree.

- `npm run typecheck`: clean.
- `npm test`: 20,059 checks, 0 failures.
- `npm run fuzz`: 200,000 seeded iterations, 0 divergences.
- `npm run native-build`: produced `native/bin/ESSTRTrim.dll`.
- `npm run native-verify`: verified x64 PE header, deterministic timestamp, NX/ASLR flags, required exports, kernel32-only import marker, SHA-256, and manifest payload byte identity (`llvm-readobj` fallback used; `dumpbin` not required).
- `npm run native-parity`: local no-Illustrator ABI vectors passed through `ESSTRTrimTest.exe`.
- `npm run build:accel`: produced `ESSTR.accel.jsx` and `ESSTR.accel.min.jsx`.
- `npm run vendor-sync-check`: verifies vendored accel bundles match `dist/` byte-for-byte.
- `npm run live-verify`: 47/47 vectors + wrapper checks verified in Illustrator 30.6.0 / ExtendScript 4.5.6.
- `native/probe.jsx` via the COM tool: `ESSTRTrim probe OK: ESSTRTrim/1`.
- `tests/esstr-accel-live-smoke.jsx` via the COM tool: `ESSTR.accel live smoke OK enabled=true len=300`.
- `npm run benchmark`: not rerun for this handoff; run before updating performance numbers.

## Release Assets

- `vendor-esstr-runtime.js`
- `vendor-esstr.js`
- `ESSTR.jsx`
- `esstr-core.esm.mjs`
- `ESSTRTrim.dll`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`

## Required Before Publishing

- Attach assets from the exact tagged commit.
