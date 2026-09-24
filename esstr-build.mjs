#!/usr/bin/env node
// ESSTR build — ESTC-canonical pipeline.
//
//   dist/ESSTR.jsx                - ESTC-built bannerless IIFE (COM-eval /
//                                   $.evalFile safe), defines var ESSTR
//   dist/vendor-esstr.js          - ESTC-built facade + gap-fill footer
//                                   (true polyfill: only installs when absent)
//   dist/ESSTR-runtime.jsx        - ESTC-built methods-only bundle (no footer)
//   dist/vendor-esstr-runtime.js  - ESTC-built methods-only bundle + same footer
//   dist/esstr-core.esm.mjs       - ESM core for Node harnesses (esbuild; not a
//                                   JSX artifact and not ESTC-checked)
//   dist/ESSTR.facade.jsx         - facade + espak adapter (ESTC-checked
//                                   composition; requires ESPAK on $.global)
//   dist/ESSTR.accel.jsx          - (--accel) MERGED ESPACK bundle: ESSTRTrim.dll
//                                   + ESChars.dll payloads, ONE loader, ONE shared
//                                   ESB64Native accel, current ESCHARS facade +
//                                   ESSTR facade + adapter
//   dist/ESSTR.accel.min.jsx      - (--accel) conservative ExtendScript minify
//
// ESTC owns the ES3 normalization, bundle-local esbuild-helper localization,
// strict-directive stripping and the conservative static gate. The previous
// Function.prototype.bind shim and hand-rolled "use strict" stripping are gone:
// both were accidental compatibility shims, not public semantics.
//
// All writes stay inside this repository. Vendoring the accel artifacts into
// the COM automation skill is an explicit integration step, never a build side
// effect:
//   node esstr-vendor-sync.mjs              (sync dist -> skill vendor)
//   node esstr-build.mjs --accel --vendor   (build + sync in one go)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var DIST = join(ROOT, 'dist');
var ENTRY = join(ROOT, 'src', 'index.ts');
var ESTC = join(ROOT, '..', 'extendscript-toolchain', 'bin', 'estc.mjs');
var ADAPTER = join(ROOT, 'tooling', 'espak-adapter.js');
var VENDOR_DIR = join(ROOT, '..', 'agent-skills', 'illustrator-com-automation-skill', 'vendor');

var WANT_VENDOR = process.argv.includes('--vendor');

function findEsbuild() {
  if (process.env.ESBUILD_PATH && existsSync(process.env.ESBUILD_PATH)) return process.env.ESBUILD_PATH;
  var direct = join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild');
  if (existsSync(direct)) return direct;
  var cacheDirs = [
    join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx'),
    join(process.env.USERPROFILE || '', 'AppData', 'Local', 'npm-cache', '_npx')
  ];
  for (var i = 0; i < cacheDirs.length; i++) {
    try {
      var entries = readdirSync(cacheDirs[i]);
      for (var j = 0; j < entries.length; j++) {
        var p = join(cacheDirs[i], entries[j], 'node_modules', 'esbuild', 'bin', 'esbuild');
        if (existsSync(p)) return p;
      }
    } catch (ignore) {}
  }
  return 'npx esbuild';
}

function esmBuild(entry, outfile) {
  execFileSync(process.execPath, [
    findEsbuild(), entry, '--bundle', '--outfile=' + outfile,
    '--format=esm', '--platform=node', '--target=es2019',
    '--log-level=warning'
  ], { stdio: 'inherit' });
}

function estcBuild(configRel) {
  if (!existsSync(ESTC)) {
    console.error('[esstr-build] ESTC not found at ' + ESTC + ' (the canonical build path)');
    process.exit(1);
  }
  execFileSync(process.execPath, [ESTC, 'build', '--config', configRel], { cwd: ROOT, stdio: 'inherit' });
}

function estcCheck(rel) {
  execFileSync(process.execPath, [ESTC, 'check', rel, '--no-target'], { cwd: ROOT, stdio: 'inherit' });
}

mkdirSync(DIST, { recursive: true });

// 1. ESM core bundle (Node harnesses import this; not a shipped JSX artifact).
esmBuild(ENTRY, join(DIST, 'esstr-core.esm.mjs'));

// 2-5. Canonical ExtendScript artifacts, all ESTC-built + ESTC-static-checked.
estcBuild('extendscript.estc.config.mjs');
estcBuild('extendscript.vendor.estc.config.mjs');
estcBuild('extendscript.runtime.estc.config.mjs');
estcBuild('extendscript.vendor-runtime.estc.config.mjs');

// 6. Loader-free facade: ESTC-built ESSTR facade + espak adapter, then the
//    conservative static gate over the composed text.
var adapterText = readFileSync(ADAPTER, 'utf8');
var facadeOut = readFileSync(join(DIST, 'ESSTR.jsx'), 'utf8') + '\n' + adapterText +
  '// ESSTR.facade.jsx - loader-free facade + espak adapter (requires ESPAK on $.global)\n';
writeFileSync(join(DIST, 'ESSTR.facade.jsx'), facadeOut);
estcCheck('dist/ESSTR.facade.jsx');
console.log('[esstr-build] wrote ' + join(DIST, 'ESSTR.facade.jsx') + ' (' + facadeOut.length + ' bytes)');

function minifyAccel(accelOut) {
  var skillDir = join(ROOT, '..', 'agent-skills', 'adobe-extendscript-minification');
  var minifyScript = join(skillDir, 'scripts', 'minify-jsx.py');
  var minifyConfig = join(skillDir, 'configs', 'conservative.json');
  if (!existsSync(minifyScript) || !existsSync(minifyConfig)) {
    console.log('[esstr-build] accel minify skipped: minification skill not found at ' + skillDir);
    return null;
  }
  var m = accelOut.match(/^\/\*[\s\S]*?\*\//);
  var banner = m ? m[0] : '';
  var body = m ? accelOut.substring(m[0].length) : accelOut;
  var bodyPath = join(DIST, '.esstr-accel-bundle.body.jsx');
  var minPath = join(DIST, '.esstr-accel-bundle.min.jsx');
  writeFileSync(bodyPath, body, 'utf8');
  execFileSync('python', [minifyScript, '--in', bodyPath, '--config', minifyConfig,
    '--out', minPath], { stdio: 'inherit' });
  var minBody = readFileSync(minPath, 'utf8');
  var minOut = (banner ? banner + '\n' : '') + minBody;
  var minFinal = join(DIST, 'ESSTR.accel.min.jsx');
  writeFileSync(minFinal, minOut, 'utf8');
  estcCheck('dist/ESSTR.accel.min.jsx');
  console.log('[esstr-build] wrote ' + minFinal + ' (' + minOut.length + ' bytes, banner preserved)');
  return minFinal;
}

function vendorAccel(vendorDir) {
  if (!existsSync(vendorDir)) {
    console.error('[esstr-build] --vendor requested but vendor dir is missing: ' + vendorDir);
    process.exit(1);
  }
  var pairs = ['ESSTR.accel.jsx', 'ESSTR.accel.min.jsx'];
  for (var i = 0; i < pairs.length; i++) {
    var from = join(DIST, pairs[i]);
    if (!existsSync(from)) { continue; }
    writeFileSync(join(vendorDir, pairs[i]), readFileSync(from));
    console.log('[esstr-build] vendored ' + pairs[i] + ' -> ' + join(vendorDir, pairs[i]));
  }
}

function buildAccel() {
  var espackBuild = join(ROOT, '..', 'espack', 'espack-build.mjs');
  var espackMerge = join(ROOT, '..', 'espack', 'espack-merge.mjs');
  var dll = join(ROOT, 'native', 'bin', 'ESSTRTrim.dll');
  // Use the CURRENT ESB64 accelerator + ESTC-built runtime explicitly. The
  // stale espack/vendor copies still carry global Object/Function.prototype
  // shims; espack-merge requires byte-identical accel entries, and the loader
  // must not inline a stale polyfill block into the final composite.
  var esb64Accel = join(ROOT, '..', 'esb64', 'native', 'bin', 'ESB64Native.dll');
  var esb64Runtime = join(ROOT, '..', 'esb64', 'dist', 'vendor-esb64-runtime.js');
  var escharsManifest = join(ROOT, '..', 'eschars', 'dist', 'ESCHARS.manifest.json');
  var escharsFacade = join(ROOT, '..', 'eschars', 'dist', 'ESCHARS.facade.jsx');
  var missing = [];
  if (!existsSync(espackBuild)) { missing.push('espack-build.mjs (sibling espack repo)'); }
  if (!existsSync(espackMerge)) { missing.push('espack-merge.mjs (sibling espack repo)'); }
  if (!existsSync(dll)) { missing.push(dll + ' (run npm run native-build)'); }
  if (!existsSync(esb64Accel)) { missing.push(esb64Accel + ' (run npm run build:native in ../esb64)'); }
  if (!existsSync(esb64Runtime)) { missing.push(esb64Runtime + ' (run npm run build in ../esb64)'); }
  if (!existsSync(escharsManifest)) { missing.push('eschars/dist/ESCHARS.manifest.json (run npm run build:accel in ../eschars)'); }
  if (!existsSync(escharsFacade)) { missing.push('eschars/dist/ESCHARS.facade.jsx (run npm run build:accel in ../eschars)'); }
  if (missing.length > 0) {
    console.error('[esstr-build] accel build requires the merged ESCHARS + ESSTR manifests; missing: ' + missing.join(', '));
    process.exit(1);
  }
  // Composition contract (do NOT embed ESCHARS.accel.jsx as a string: that
  // would nest an ESPAK loader and double-carry ESB64Native). espack-merge
  // combines the ESSTRTrim and ESChars manifests into ONE loader with ONE
  // shared accel and flat payloads; the CURRENT loader-free ESCHARS facade and
  // the ESTC-built ESSTR facade are appended, then the adapter.
  // Both espack-build and espack-merge render the loader (each reads
  // ESB64_RUNTIME_PATH), so pin the current ESTC-built runtime for both child
  // processes. Inherited by execFileSync; scoped to this build process only.
  process.env.ESB64_RUNTIME_PATH = esb64Runtime;
  var esstrScratchBundle = join(DIST, '.esstr-trim-scratch.jsx');
  var esstrManifest = join(DIST, '.ESSTRTrim.manifest.json');
  execFileSync(process.execPath, [espackBuild, '--embed', dll, '--accel', esb64Accel, '--accel-version', '2', '--out', esstrScratchBundle,
    '--name', 'esstr', '--manifest-out', esstrManifest, '--quiet'], { stdio: 'inherit' });
  var mergedLoader = join(DIST, '.esstr-merged-loader.jsx');
  var mergedManifest = join(DIST, 'ESSTR.manifest.json');
  execFileSync(process.execPath, [espackMerge, '--merge', esstrManifest, escharsManifest,
    '--out', mergedLoader, '--name', 'esstr', '--manifest-out', mergedManifest, '--quiet'], { stdio: 'inherit' });
  var loaderText = readFileSync(mergedLoader, 'utf8');
  var escharsFacadeText = readFileSync(escharsFacade, 'utf8');
  var facadeText = readFileSync(join(DIST, 'ESSTR.jsx'), 'utf8');
  var accelOut = loaderText + '\n' + escharsFacadeText + '\n' + facadeText + '\n' + adapterText +
    '// ESSTR.accel.jsx - MERGED accel (espack-merge: ESSTRTrim + ESChars manifests -> ONE loader, ONE shared ESB64Native accel, flat payloads; ESCHARS facade + ESSTR facade appended; NO nested ESPAK bundle)\n';
  writeFileSync(join(DIST, 'ESSTR.accel.jsx'), accelOut);
  console.log('[esstr-build] wrote ' + join(DIST, 'ESSTR.accel.jsx') + ' (' + accelOut.length + ' bytes)');
  estcCheck('dist/ESSTR.accel.jsx');
  minifyAccel(accelOut);
  if (WANT_VENDOR) { vendorAccel(VENDOR_DIR); }
}

if (process.argv.includes('--accel')) {
  buildAccel();
} else if (WANT_VENDOR) {
  console.error('[esstr-build] --vendor requires --accel (only accel artifacts are vendored)');
  process.exit(1);
}

console.log('[esstr-build] ESTC canonical build complete: ' + join(DIST, 'ESSTR.jsx') + ', ' +
  join(DIST, 'vendor-esstr.js') + ', ' + join(DIST, 'ESSTR-runtime.jsx') + ', ' +
  join(DIST, 'vendor-esstr-runtime.js') + ', ' + join(DIST, 'esstr-core.esm.mjs'));
