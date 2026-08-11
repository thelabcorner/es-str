# v1.2.0 — 2026-08-11

SemVer: minor — adds a promoted ESCHARS native trim fallback route in the accelerated bundle while preserving ESSTR's existing public trim semantics.

## Added

- Added an ESCHARS trim fallback lane for the accelerated bundle: `ESSTRTrim.dll` remains first choice, ESCHARS native `trimModern*` is second choice for long edge-whitespace inputs, and the pure ES3 scanner remains the semantic fallback.
- Added NUL and surrogate safety gates before ESSTR calls the ESCHARS native lane.
- Added `npm run live-verify:accel`, a real merged-accel smoke that loads `dist/ESSTR.accel.jsx`, disables `ESSTRTrim.dll`, verifies ESCHARS lazy trim resolution, and confirms clean/short/NUL/surrogate inputs skip ESCHARS.

## Boundary Contract

- ESSTR continues to preserve NUL and lone surrogate code units through the pure scanner.
- ESCHARS is only used after long-string, edge-whitespace, NUL, and surrogate gates pass.
- If ESCHARS fails to load or a trim call throws, ESSTR falls back to the pure scanner.

## Verification

- `npm run build:accel`: clean, regenerated merged ESSTRTrim + ESCHARS accel artifacts.
- `npm test`: 20,059 ESSTR checks, native trim parity, and vendor-sync check passed.
- `npm run typecheck`: clean.
- `npm run live-verify`: 47/47 live vectors + wrapper checks passed in Illustrator 30.6.0 / ExtendScript 4.5.6.
- `npm run live-verify:accel`: merged accel loaded, ESSTR native gate enabled, ESCHARS facade loaded, ESCHARS trim resolved lazily, fallback route checks passed.

## Release Assets

- `vendor-esstr-runtime.js`
- `vendor-esstr.js`
- `ESSTR.jsx`
- `esstr-core.esm.mjs`
- `ESSTRTrim.dll`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`
