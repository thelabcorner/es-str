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
- Core/differential/coercion suite: **20,059 checks passed**; native trim ABI parity: **PASS**; borrowed-ownership and manifest-v2 contracts: **PASS**.
- Seeded differential fuzzing: **200,000 iterations passed** (`seed 31337`).
- ESTC static/live parse: all seven shipped ExtendScript surfaces pass on Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 through COMTool V2.
- Standalone live verification: **47/47 vectors passed**.
- Root-only accelerated proof: cold evaluation activates `ESB64 -> ESCHARS -> ESSTR` transitively through one ESPAK control plane; native ESSTR trim acceleration and ESCHARS fallback/hybrid behavior both pass.
- Final composed UTF-8 sizes: `ESSTR.accel.jsx` **285,984 B**; `ESSTR.accel.min.jsx` **253,921 B**.
- COM-skill vendor copies of both accelerated artifacts are byte-identical to the final generated files.

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
