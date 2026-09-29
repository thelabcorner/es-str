# ESSTR v1.3.0 — 2026-09-29

**SemVer: minor** — trim/string semantics and the public ESSTR API remain compatible; the accelerated distribution moves to the canonical ESPACK 0.5 manifest-v2 runtime/library composition architecture.

## Changed

- Added stable manifest-v2 library identity/provenance for ESSTR with exact UTF-8 artifact lengths and SHA-256s.
- The accelerated root resolves the dependency-first library closure:
  `esb64@1.3.0 -> eschars@1.2.0 -> esstr@1.3.0`.
- ESCHARS native capability is retained as the required byte-operations layer; `ESSTRTrim` is an optional native acceleration capability with the ES3 trim scanner remaining semantic authority/fallback.
- The full and minified accelerated artifacts now use one persistent `$.global.ESPAK` loader/control plane rather than nested loaders or manual sibling concatenation.
- ESPACK owns loaded ExternalObjects in the composed distribution. ESSTR and ESCHARS consume borrowed handles and do not unload ESPACK-owned objects.
- The build now resolves a usable Python 3 interpreter explicitly for the ExtendScript minification lane instead of assuming a bare `python` command.
- Added manifest-v2 and borrowed-ownership regression coverage and updated the hybrid ESCHARS/ESSTR live proof for the transitive root composition.

## Verification

- `npm run release:gate`: exit 0 on the final v1.3.0 release candidate.
- Typecheck, accelerated build, core/differential/native parity tests, ownership checks, manifest-v2 checks, seeded fuzzing, and ESTC static parse: pass.
- ESTC live parse: pass on Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 through COMTool V2.
- Root-only accelerated proof: cold evaluation activates ESB64 -> ESCHARS -> ESSTR transitively through one ESPAK control plane.
- Native ESSTR trim acceleration and ESCHARS fallback/hybrid behavior: pass.
- COM-skill vendor copies of `ESSTR.accel.jsx` and `ESSTR.accel.min.jsx` are byte-identical to the final generated artifacts.

## Release assets

- `ESSTR.jsx`
- `vendor-esstr.js`
- `vendor-esstr-runtime.js`
- `esstr-core.esm.mjs`
- `ESSTR.facade.jsx`
- `ESSTR.manifest.json`
- `ESSTR.accel.jsx`
- `ESSTR.accel.min.jsx`
- `ESSTRTrim.dll`
