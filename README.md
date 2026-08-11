<div align="center">

# ESSTR: String Whitespace Methods for Adobe ExtendScript (ES3)

## ExtendScript STRing = E.S.STR

### The drop-in `trim` / `trimLeft` / `trimRight` / `trimStart` / `trimEnd` library for Adobe Illustrator, InDesign, Photoshop & any ExtendScript host

[![Spec: modern trim exact](https://img.shields.io/badge/spec-modern%20trim%20exact-success)](https://262.ecma-international.org/#sec-string.prototype.trim)
[![Differential: Node natives](https://img.shields.io/badge/differential-vs%20Node%20natives%20220k%2B%20checks-purple)](https://262.ecma-international.org/#sec-string.prototype.trim)
[![Engine parity: live](https://img.shields.io/badge/engine%20parity-live%2047%2F47%20vectors-green)](https://extendscript.docsforadobe.dev/)
[![Adobe: Creative Suite](https://img.shields.io/badge/Adobe%20-Creative%20Suite-red?logo=adobe&logoColor=white)](https://extendscript.docsforadobe.dev/)
[![Engine](https://img.shields.io/badge/ExtendScript-ES3-green)](#compatibility)
[![Size](https://img.shields.io/badge/runtime-8.0%20KB-orange)](#installation)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL%203.0--or--later-blue)](https://www.gnu.org/licenses/gpl-3.0.html)

</div>

---

## Part Of The Same Toolkit

> Production-grade ExtendScript infrastructure for Illustrator-era JavaScript engines.

<table>
<tr>
<td width="50%" valign="top">

### Runtime Primitives

**[ESON](https://github.com/thelabcorner/eson)**  
Strict RFC 8259 JSON for ExtendScript.

**[ESB64](https://github.com/thelabcorner/es-b64)**  
Base64 and UTF-8 utilities.

**[ESARR](https://github.com/thelabcorner/es-arr)**  
ES5+ Array compatibility methods.

**[ESSTR](https://github.com/thelabcorner/es-str)**  
String whitespace and trim methods.

**[ESCHARS](https://github.com/thelabcorner/es-chars)**  
Native bulk byte operations.

**[ESHTTP](https://github.com/thelabcorner/es-http)**  
HTTP transport for ExtendScript automation.

</td>
<td width="50%" valign="top">

### Build & Integration Tools

**[ESPACK](https://github.com/thelabcorner/espack)**  
Self-extracting ExternalObject bundles.

**[ESMIN](https://github.com/thelabcorner/es-min)**  
Minification for shipped JSX bundles.

**ESOBF** <sub>coming soon</sub>  
Obfuscation for hardened JSX distribution.

</td>
</tr>
</table>

Also from the same team: **[ArcFit.dev](https://arcfit.dev)**, deterministic arc warp for Illustrator.

---

## Table of Contents

- [Why ESSTR?](#why-esstr)
- [Features](#features)
- [Which build should I use?](#which-build-should-i-use)
- [Get the Release](#get-the-release)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
- [Validation](#validation)
- [Performance](#performance)
- [Security Model](#security-model)
- [Compatibility](#compatibility)
- [Engine quirks that shaped the design](#engine-quirks-that-shaped-the-design)
- [Development](#development)
- [Repository layout](#repository-layout)
- [Credits](#credits)
- [License](#license)

---

## Why ESSTR?

**ExtendScript (SpiderMonkey ES3) ships no `String.prototype.trim`** — probed live on Illustrator 30.6.0 / ExtendScript 4.5.6. Every script that parses settings files, form fields, CSV, or SVG attributes ends up hand-rolling whitespace stripping (ArcFit alone has two private copies). ESSTR is the polyfill: **spec-exact against the modern trim (V8/Node semantics), differential-validated against Node natives, and built from measurements taken in the real Adobe engine.**

The engine makes this harder than it looks:

- **The stock regex-based shim is spec-wrong here.** Verified live: this engine's regex `\s` does *not* match U+FEFF (ES3-era class — the stock shim patches that) but *does* match U+180E (Mongolian vowel separator, Unicode 3.0 classification), which modern trim must KEEP. The stock `replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')` therefore strips U+180E — a silent data corruption on old Mongolian text.
- **Long anchored whitespace regexes can wedge the engine** (a 350-char `^\s+|\s+$` loop hung the COM session during calibration — same class as the skill's documented anchored-regex hangs). The regex approach is unusable at scale regardless.
- ESSTR therefore scans with `charCodeAt` — the only engine-safe way to read code units (`charAt` returns `""` for U+0000) — with an explicit whitespace table ordered by measured frequency.

---

## Features

- **Modern-trim-exact whitespace**: WhiteSpace + LineTerminator *including* U+FEFF (ES6+ semantics, matching V8/Node): TAB, VT, FF, SP, NBSP, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF. Correctly KEEPS U+180E, U+0085 (NEL), U+200B (ZWSP), NUL, and surrogates.
- **Verified two ways**: 47 fixed vectors + 20,000-case differential vs Node natives (`npm test`), and **200,000 seeded fuzz iterations** with zero divergences (`npm run fuzz`). Live engine parity: 47/47 vectors + all prototype-wrapper checks (`npm run live-verify`).
- **Measured, not assumed**: the identity fast path returns the input string unchanged when neither edge is whitespace — the common case — costing ~2 `charCodeAt` lookups; the whitespace comparisons are **inlined** in the scan loops (a per-char helper call measured slower) and ordered by observed frequency; a 256-entry bitmap table was benchmarked and *rejected* (~30–40% slower than short-circuiting chains); and a small **8-entry LRU memo** (the esb64 family pattern) makes repeated strings ~free — real workloads re-trim the same values (settings keys, CSV fields, SVG attributes). Memo keys are `' '`-prefixed so no object-inherited property can collide; strings > 256 chars skip the memo.
- **ToString semantics, exactly like Node**: `trim.call(123)` → `'123'`, `trim.call(new String(' x '))` → `'x'`; `null`/`undefined` throw `TypeError` (the facade guards them — the engine's own ES3 `.call(null)` semantics bind the global object, a documented engine quirk).
- **Never mangles data**: NULs and lone surrogates at the edges survive (the scan is code-unit based; `substring` is used for the result, never `charAt`).
- **True polyfill install**: gap-fills `String.prototype.trim/trimLeft/trimRight/trimStart/trimEnd` only when absent; `install({ forceReplace: true })` overrides. The `ESSTR` facade (pure functions) is always available.
- **No dependency default path**: one file. Two JSX-only builds: full (`ESSTR.jsx` / `vendor-esstr.js`) and runtime (`vendor-esstr-runtime.js`, 8.0 KB, methods only) for per-eval injection.
- **Optional Windows x64 accelerator**: `ESSTRTrim.dll` plus `ESSTR.accel.jsx` / `.min.jsx` provide an ExternalObject-backed long-string lane. The accel bundle is merge-composed with ESCHARS (`ESChars.dll`) through `espack-merge`, so ESSTR and ESCHARS share one ESPACK loader and one `ESB64Native` decoder instead of nested bundles. The pure ES3 scanner stays the fallback and semantic authority.

---

## Which build should I use?

| | **Runtime build** | **Full build** | **Accelerated build** |
|---|---|---|---|
| Files | `vendor-esstr-runtime.js` | `vendor-esstr.js`, `ESSTR.jsx` | `ESSTR.accel.jsx`, `ESSTR.accel.min.jsx`, `ESSTRTrim.dll` |
| Size | 8.0 KB | 17.0 KB / 16.3 KB | 211.0 KB / 180.8 KB / 3.1 KB |
| API | the 5 methods | methods + `capabilities()`, `install()`, `benchmark()` | full API + `enableNativeGate()`, `disableNativeGate()`, `nativeGateStatus()`, `useEspack()` |
| Installs `String.prototype.*` | yes (gap-fill) | yes (gap-fill) | yes (gap-fill) |
| Best for | per-eval injection, scripts that only need trim | libraries that want install control or capability census | Windows x64 scripts that want a self-extracting native lane for long strings |

**Rule of thumb:** if your script only calls trim, use the runtime build. Reach for the full build for `capabilities()`/`install({forceReplace})`/`benchmark()`.

---

## Get the Release

**All production bundles ship as GitHub release assets — this repo holds sources. Grab the runnable builds from the [Releases page](https://github.com/thelabcorner/es-str/releases).**

[![Latest stable](https://img.shields.io/github/v/release/thelabcorner/es-str?label=Latest%20stable)](https://github.com/thelabcorner/es-str/releases/latest)
[![Release date](https://img.shields.io/github/release-date/thelabcorner/es-str?label=Released)](https://github.com/thelabcorner/es-str/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/thelabcorner/es-str/total?label=Downloads)](https://github.com/thelabcorner/es-str/releases)

1. Open the [Releases page](https://github.com/thelabcorner/es-str/releases).
2. Download the asset that matches your runtime.
3. Include or eval the file from your script; use the DLL only through the accelerated bundle unless you are testing the native boundary directly.

| You are... | Take this release | And this asset |
|---|---|---|
| Injecting trim methods into short-lived COM evals | Latest stable | `vendor-esstr-runtime.js` |
| Writing a normal ExtendScript script | Latest stable | `vendor-esstr.js` |
| Importing the facade without prototype install | Latest stable | `ESSTR.jsx` |
| Running Node-side tests or tooling | Latest stable | `esstr-core.esm.mjs` |
| Using the self-extracting native lane on Windows x64 | Latest stable | `ESSTR.accel.jsx` or `ESSTR.accel.min.jsx` (merged ESSTRTrim + ESCHARS payloads) |
| Testing the ExternalObject boundary directly | Latest stable | `ESSTRTrim.dll` + `native/probe.jsx` |

> **Rule of thumb: start with the latest stable tag.** Every release asset is produced by `npm run build`, `npm run native-build`, and `npm run build:accel` from the exact tagged commit. Releases follow [SemVer](https://semver.org/); watch the repository → *Releases* to get notified.

---

## Installation

```jsx
// @includepath "path/to/esstr/dist"
#include "vendor-esstr.js"

// String.prototype.trim, trimLeft, trimRight, trimStart, trimEnd now exist
// (gap-filled only if absent). The facade is also available:
var name = ESSTR.trim(rawName);              // '  Jane Doe \n' -> 'Jane Doe'
var key  = ESSTR.trimLeft(line);             // leading whitespace only
var rest = ESSTR.trimRight(csvCell);         // trailing whitespace only
```

Or load explicitly from COM: `$.evalFile(File("C:/path/to/esstr/dist/vendor-esstr.js"));`

For the accelerated single-file bundle on Windows x64:

```jsx
// @includepath "path/to/esstr/dist"
#include "ESSTR.accel.jsx"

// ESSTR.espack reports whether the native gate loaded; trim still works even
// when native loading fails because the ES3 scanner remains the fallback.
var status = ESSTR.espack;
var value = ESSTR.trim(rawValue);
```

---

## Quick Start

```jsx
// facade style: pure functions, string first — the same signatures work in
// Node against the ESM build
var name = ESSTR.trim(rawName);              // '  Jane Doe \n' -> 'Jane Doe'
var key  = ESSTR.trimLeft(line);             // leading whitespace only
var rest = ESSTR.trimRight(csvCell);         // trailing whitespace only

// prototype style after install:
var name2 = rawName.trim();                  // gap-filled String.prototype.trim
```

---

## API

- `trim(s)` — strips WhiteSpace + LineTerminator (+ FEFF) from both ends.
- `trimLeft(s)` / `trimStart(s)` — leading only (ES2019 naming, both provided).
- `trimRight(s)` / `trimEnd(s)` — trailing only.
- All are ToString-based: numbers/booleans/String objects coerce; `null`/`undefined` throw `TypeError` (matching Node). The prototype wrappers forward `this`; the facade takes the value directly.
- `capabilities()` → `{ engine, nativeList, missing }`.
- `install(options?)` → gap-fill install (returns the pre-install census; `forceReplace: true` overwrites).
- `clearMemo()` — clears the LRU memos (also useful for deterministic memory profiles).
- `enableNativeGate(options)` / `disableNativeGate()` / `nativeGateStatus()` — opt-in ExternalObject lane control. The ESPACK bundle calls `enableNativeGate()` automatically after extracting `ESSTRTrim.dll`.
- `benchmark()` → `BenchItem[]` medians in the live engine.

---

## Validation

| Check | Command | Result |
|---|---|---|
| TypeScript strict | `npx tsc --noEmit -p .` | clean |
| Fixed vectors + 20k differential vs Node natives | `npm test` | 20059 checks, 0 failures |
| Seeded fuzz vs Node natives (200k iterations) | `npm run fuzz` | 0 divergences (seed 31337) |
| Live engine parity (47 vectors + wrapper semantics) | `npm run live-verify` | 47/47 + all extras |
| Live benchmarks (ours vs shim regex vs hand-rolled) | `npm run benchmark` | see table |

The differential oracle is Node's native `String.prototype.trim/trimLeft/trimRight/trimStart/trimEnd`; engine parity is verified by running the identical bundled code through `ILLUSTRATOR_COM_TOOL.py` (hex-transported code units so NULs and surrogates survive JSON).

Native accelerator validation is layered separately: `npm run native-build` builds `native/bin/ESSTRTrim.dll`, `npm run native-verify` verifies the x64 PE header, required exports, deterministic timestamp, NX/ASLR flags, import markers, SHA-256, and ESPACK manifest payload byte identity, and `npm run build:accel` emits the ESPACK bundles. `native/probe.jsx` and `tests/esstr-accel-live-smoke.jsx` verify the DLL and self-extracting bundle in Illustrator.

---

## Performance

Measured live in Adobe Illustrator 30.6.0 / ExtendScript 4.5.6, best-of-9 primed `$.hiresTimer` medians, `npm run benchmark` (reproducible). Inputs bounded to short strings — the stock shim's regex wedges the engine from ~200 chars up (verified live).

| input | len | ESSTR repeat | ESSTR fresh | shim regex | hand scan | vsShim repeat | vsShim fresh |
|---|---|---|---|---|---|---|---|
| plain (no edge ws) | 43 | 3 µs | 164 µs / 40 | 586 µs / 40 | 831 µs / 40 | **4.00x** | **3.57x** |
| padded (4 edge ws) | 49 | 3 µs | 165 µs / 40 | 607 µs / 40 | 905 µs / 40 | **3.67x** | **3.68x** |
| all-whitespace | 11 | 3 µs | 163 µs / 40 | 614 µs / 40 | 888 µs / 40 | **2.00x** | **3.77x** |
| unicode edges | 6 | 3 µs | 136 µs / 40 | 609 µs / 40 | 877 µs / 40 | **2.33x** | **4.48x** |

"repeat" = the same string trimmed repeatedly (memo hit — the real-world case: settings keys, CSV fields); "fresh" = 40 distinct strings, memo-miss dominated (per-40 totals shown; ESSTR ≈ 3.4–4.1 µs/string vs shim ≈ 15 µs/string). Correctness on the same inputs: the stock shim **fails U+180E** (strips it — verified live) and **wedges the engine beyond ~200 chars**; ESSTR is spec-exact, memoized, and wedge-safe — the inlined scan alone measures ~5x faster than a helper-based hand scan.

### Native acceleration (`ESSTR.accel.jsx`)

`ESSTR.accel.jsx` is an ESPACK self-extracting bundle. It is built with `espack-merge`: one loader, one shared `ESB64Native` accelerator, and flat `ESSTRTrim.dll` + `ESChars.dll` payloads. On eval it materializes `ESSTRTrim.dll`, loads it through `ExternalObject`, enables the native trim gate when the DLL passes a numeric smoke check, and publishes the merged ESCHARS facade for sibling byte-unit workloads. The native lane is deliberately conservative:

- strings shorter than the native threshold stay in the ES3 lane because the memoized scanner is already faster for short/repeated values;
- strings containing NUL or surrogate code units stay in the ES3 lane because the ExternalObject string boundary is unsafe for those units;
- any native load, binding, or call failure falls back to the ES3 scanner.

Build it with `npm run native-build && npm run build:accel` after building the sibling ESCHARS accel (`npm run build:native && npm run build:accel` in `../eschars`). Run `native/probe.jsx` and `tests/esstr-accel-live-smoke.jsx` in Illustrator before release; ExternalObject binding is per-DLL-build.

**Measured v1.1.0 trim delta vs v1.0.0:** no trim throughput increase. Live benchmark in Illustrator 30.6.0 / ExtendScript 4.5.6 showed memo-hit repeat time unchanged at 3 µs, while 40-fresh-string totals moved from 156–159 µs (v1.0.0 release asset) to 158–160 µs (v1.1.0 working tree), a ~0–1.3% loss within microbenchmark noise. The v1.1.0 value is packaging/composition: ESSTR and ESCHARS share one ESPACK loader and one `ESB64Native` decoder, and scripts that also need ESCHARS byte-unit operations get that facade from the same accel bundle. ESSTR trim speed remains governed by `ESSTRTrim.dll` or the pure ES3 scanner fallback.

---

## Security Model

The default ESSTR builds are pure data-transform libraries: plain function definitions installed onto `String.prototype`. No network access and no document mutation. The accelerated build evals only bundled facades that ESSTR ships (`ESSTR`, merged `ESCHARS`, and ESPACK loader code), writes extracted DLL payloads to ESPACK's local cache, then loads them through `ExternalObject`. The ES3 lane never depends on native lanes: native load, binding, or call failure falls back to the pure scanner. The only override surface is deliberate: `install({ forceReplace: true })` replaces an existing native implementation; the default gap-fill install leaves natives untouched.

---

## Compatibility

| Target | Status |
|---|---|
| ExtendScript ES3 (no `let`/`const`/arrows/`Promise`/`Map` in the bundle; `"use strict"` stripped) | Bundled |
| Any ExtendScript host (Illustrator, InDesign, Photoshop, After Effects, InCopy, Bridge) | Works; Windows/macOS, no host-specific APIs |
| ExternalObject accelerator | Windows x86-64 Adobe hosts with `ExternalObject` enabled |
| Node.js v18+ | Build and test harnesses |

---

## Engine quirks that shaped the design

All measured live on ExtendScript 4.5.6 (Illustrator 30.6.0); re-probe other hosts.

- **Regex `\s` is wrong for modern trim in both directions.** It misses U+FEFF (the stock shim patches this explicitly) and matches U+180E (must be kept). No regex can express "whitespace minus U+180E plus U+FEFF" cleanly here, and long anchored whitespace regexes can hang the engine — the charCodeAt scan is the only correct and safe implementation.
- **Mixed `&&`/`||` chains miscompile when the bundler strips parens.** Verified: `c === 12288 || ... || c >= 8192 && c <= 8202` (esbuild's parenthesization-removed output) evaluates **false for every term** in this engine; the parenthesized form and explicit ifs work. ESSTR writes every mixed-chain whitespace check as explicit `if` statements — bundler-proof.
- **`charAt` lies for U+0000** (`""`); `charCodeAt` and `substring` are correct. All scans are code-unit based.
- **A bitmap table is slower than a comparison chain.** A 256-entry `charCodeAt` table measured ~30–40% slower than short-circuiting `||` chains in the inner loop (contrary to the usual web-JS wisdom) — the chain, ordered by observed frequency (space, tab, LF, CR, then the rest), wins.
- **A small LRU memo carries the repeat workload.** 8 entries per method, `' '`-prefixed string keys (immune to inherited-property and `__proto__` collisions), strings > 256 chars skip it, `clearMemo()` resets it. Same design as esb64's payload memo; measured 2–4x on repeated strings and never slower than the scan on misses (the miss is one property lookup).
- **`fn.call(null)` binds the GLOBAL object** (ES3 non-strict `thisArg` semantics) — the prototype wrapper can never receive `null`; only the facade's direct-argument guard throws, exactly as Node's prototype method does.
- **The COM session persists `$.global` across evals**: a gap-fill footer never replaces wrappers installed by an earlier run. Re-installs in a long-lived session need `install({ forceReplace: true })` (the live-verify probes do this).
- **Every error reports `name: "Error"`** — discriminate with `instanceof TypeError`, not `.name`.

---

## Development

```bash
npm install            # esbuild + typescript (+ esarr devDependency, dogfooded in the harnesses)
npm run build          # dist/ESSTR.jsx, vendor-esstr.js, vendor-esstr-runtime.js, esstr-core.esm.mjs
npm run native-build   # native/bin/ESSTRTrim.dll (Windows x64 toolchain)
npm run build:accel    # dist/ESSTR.accel.jsx + ESSTR.accel.min.jsx
npm test               # vectors + differential vs Node natives
npm run fuzz           # 200k seeded differential iterations
npm run live-verify    # 47 vectors + wrapper semantics in the real engine (COM tool)
npm run benchmark      # ours vs stock shim regex vs hand-rolled in the real engine
```

The identical TypeScript core (`src/string-core.ts`) ships as an ESM bundle for Node (tests, differential oracle) and as the ESSTR IIFE for the engine. Test vectors live in `tests/vectors.ts`; `tests/callbacks.ts` holds the single canonical runner shared by the Node harness and the live probe. Harness bookkeeping uses the esarr library — the family dogfoods itself.

---

## Repository layout

```
esstr/
  src/            TypeScript core (string-core.ts shared by both bundles), runtime, types
  native/         ESSTRTrim.dll source, build script, ExternalObject probe
  tests/          vectors.ts + callbacks.ts + Node harnesses (custom, no framework) + fuzz
  dist/           generated bundles (gitignored; produced by npm run build)
```

---

## Credits

ESSTR stands on the shoulders of the ExtendScript community:

- **[docsforadobe](https://github.com/docsforadobe) and the docsforadobe.dev community:** maintainers of the de-facto reference documentation for the ExtendScript runtime. Their reverse-engineering of the engine's string semantics and parser quirks made the measured findings in this README possible to write down at all.
- **The ECMAScript spec (modern trim):** the WhiteSpace + LineTerminator definition this library implements exactly.
- **The ESON/ESB64 family:** the LRU-memo pattern, `charCodeAt` scanning discipline and esbuild-quirk handling carry over directly; harness bookkeeping dogfoods esarr.

---

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

---

<p align="center"><small>ESSTR: ExtendScript String trim. Built for the engine, measured on the engine, spec-exact.</small></p>
