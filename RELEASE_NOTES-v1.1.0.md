# v1.1.0 — 2026-08-11

SemVer: minor — the accelerated bundle composition changed by adding ESCHARS as a merged flat payload while preserving the public ESSTR API.

## Added

- `ESSTR.accel.jsx` is now merge-composed with ESCHARS through `espack-merge`.
- The accelerated bundle carries flat `ESSTRTrim.dll` and `ESChars.dll` payloads with one ESPACK loader and one shared `ESB64Native` accelerator.
- `ESSTR.eschars` reports the merged ESCHARS facade status after accel eval.

## Changed

- Removed the speculative `packBytes()` trim fallback from the runtime path. ESSTR trim acceleration remains the proven `ESSTRTrim.dll` gate; ESCHARS is merged for composition and future native trim surface reuse, not for slower byte-packed trimming.

## Performance

- Trim throughput did **not** improve in v1.1.0. Measured in Illustrator 30.6.0 / ExtendScript 4.5.6 against the published v1.0.0 `vendor-esstr.js`: repeat memo-hit trim stayed at 3 µs; 40 fresh strings measured 156–159 µs on v1.0.0 vs 158–160 µs on v1.1.0 (~0–1.3% slower, within microbenchmark noise).
- The v1.1.0 performance benefit is compositional, not a direct trim speedup: the accel bundle now carries ESSTRTrim + ESCHARS as flat merged payloads with one ESPACK loader and one shared `ESB64Native` decoder. Scripts that also use ESCHARS byte-unit operations can consume `ESSTR.accel.jsx` without loading a second ESPACK bundle.

## Verification

Gate: typecheck clean / 20,059 Node assertions / local native ABI parity / native DLL PE+manifest verification / vendor-sync byte identity / 47/47 live vectors / accel live smoke. All green on this commit.

- `npm run typecheck`: clean.
- `npm test`: 20,059 checks + local native parity + vendor-sync quiet check.
- `npm run native-verify`: ESSTRTrim.dll PE/export/payload identity verified.
- `npm run vendor-sync-check`: vendored accel bundles match `dist/` byte-for-byte.
- `npm run benchmark`: v1.1.0 live trim numbers recorded; `ESSTR_VENDOR_PATH=<v1.0.0 vendor-esstr.js>` benchmark used for comparison.

## Release Assets

- `vendor-esstr-runtime.js`
- `vendor-esstr.js`
- `ESSTR.jsx`
- `esstr-core.esm.mjs`
- `ESSTRTrim.dll`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`
