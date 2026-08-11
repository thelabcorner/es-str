# v1.1.1 — 2026-08-11

SemVer: patch — documentation and release-note correction only; no API or runtime behavior change.

## Fixed

- Corrected README build-size values for the v1.1.x merged bundle generation: `vendor-esstr.js` 17.0 KB and `ESSTR.jsx` 16.3 KB.
- Clarified the accelerated-build security model: bundled facades are first-party code, DLLs are extracted to ESPACK's cache, and the ES3 scanner never depends on native lanes.
- Added the canonical single-line release gate to the v1.1.x release notes.

## Performance

- No new performance change in v1.1.1. v1.1.x remains a composition release: merged ESSTRTrim + ESCHARS payloads with one ESPACK loader and one shared `ESB64Native` decoder.

## Verification

Gate: typecheck clean / 20,059 Node assertions / local native ABI parity / native DLL PE+manifest verification / vendor-sync byte identity / 47/47 live vectors / accel live smoke. All green on this commit.

- `npm run typecheck`: clean.
- `npm test`: 20,059 checks + local native parity + vendor-sync quiet check.
- `npm run native-verify`: ESSTRTrim.dll PE/export/payload identity verified.
- `npm run vendor-sync-check`: vendored accel bundles match `dist/` byte-for-byte.
- `npm run live-verify`: 47/47 live vectors + wrapper checks in Illustrator 30.6.0 / ExtendScript 4.5.6.
- `tests/esstr-accel-live-smoke.jsx` via COM: merged accel loads with ESSTR native gate and ESCHARS facade.

## Release Assets

- `vendor-esstr-runtime.js`
- `vendor-esstr.js`
- `ESSTR.jsx`
- `esstr-core.esm.mjs`
- `ESSTRTrim.dll`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`
