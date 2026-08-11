# v1.1.0 — 2026-08-11

SemVer: minor.

## Added

- `ESSTR.accel.jsx` is now merge-composed with ESCHARS through `espack-merge`.
- The accelerated bundle carries flat `ESSTRTrim.dll` and `ESChars.dll` payloads with one ESPACK loader and one shared `ESB64Native` accelerator.
- `ESSTR.eschars` reports the merged ESCHARS facade status after accel eval.

## Changed

- Removed the speculative `packBytes()` trim fallback from the runtime path. ESSTR trim acceleration remains the proven `ESSTRTrim.dll` gate; ESCHARS is merged for composition and future native trim surface reuse, not for slower byte-packed trimming.

## Verification

- `npm run typecheck`: clean.
- `npm test`: 20,059 checks + local native parity + vendor-sync quiet check.
- `npm run native-verify`: ESSTRTrim.dll PE/export/payload identity verified.
- `npm run vendor-sync-check`: vendored accel bundles match `dist/` byte-for-byte.

## Release Assets

- `vendor-esstr-runtime.js`
- `vendor-esstr.js`
- `ESSTR.jsx`
- `esstr-core.esm.mjs`
- `ESSTRTrim.dll`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`
