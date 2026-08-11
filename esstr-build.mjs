#!/usr/bin/env node
// ESSTR build: bundles the TypeScript core into
//   dist/ESSTR.jsx                - bannerless IIFE (COM-eval / $.evalFile safe),
//                                   defines var ESSTR (the facade)
//   dist/vendor-esstr.js          - production drop-in: facade + install footer
//                                   that gap-fills String.prototype.* when
//                                   absent (true polyfill semantics)
//   dist/vendor-esstr-runtime.js  - slim methods-only vendor (per-eval
//                                   injection), same gap-fill footer
//   dist/ESSTR-runtime.jsx        - build intermediate (bare bundle, no shim,
//                                   no footer - not standalone-loadable)
//   dist/esstr-core.esm.mjs       - ESM bundle of the core for Node harnesses
//   dist/ESSTR.accel.jsx          - (--accel) MERGED ESPACK bundle:
//                                   ESSTRTrim.dll + ESChars.dll payloads,
//                                   one loader, one shared ESB64Native accel,
//                                   ESCHARS facade + ESSTR facade + adapter
//   dist/ESSTR.accel.min.jsx      - (--accel) conservative ExtendScript minify
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var DIST = join(ROOT, 'dist');
var ENTRY = join(ROOT, 'src', 'index.ts');

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

function jsxBuild(entry, outfile) {
  execFileSync(process.execPath, [
    findEsbuild(), entry, '--bundle', '--outfile=' + outfile,
    '--format=iife', '--global-name=ESSTR', '--platform=neutral', '--target=es5',
    '--log-level=warning'
  ], { stdio: 'inherit' });
}

mkdirSync(DIST, { recursive: true });

// 1. ESM core bundle (Node harnesses import this).
esmBuild(ENTRY, join(DIST, 'esstr-core.esm.mjs'));

// 2. JSX bundle with the ES3 shim prepended (Function.prototype.bind guard;
//    probed present on 4.5.6, kept for other hosts).
var jsx = join(DIST, 'ESSTR.jsx');
jsxBuild(ENTRY, jsx);

var shim = [
  'if (typeof Function.prototype.bind !== "function") {',
  '  Function.prototype.bind = function (thisArg) {',
  '    var fn = this;',
  '    var args = Array.prototype.slice.call(arguments, 1);',
  '    return function () {',
  '      return fn.apply(thisArg, args.concat(Array.prototype.slice.call(arguments)));',
  '    };',
  '  };',
  '}',
  ''
].join('\n');

var finalJsx = shim + readFileSync(jsx, 'utf8');
finalJsx = finalJsx.replace(/"use strict";?/g, '');
writeFileSync(jsx, finalJsx);

// 3. Production vendor: the same bundle + a gap-fill footer (true polyfill:
//    only installs when absent; install({ forceReplace: true }) overrides).
var footer = [
  '(function () {',
  '  var g = null;',
  '  try { if (typeof $ !== "undefined" && $.global) { g = $.global; } } catch (e1) {}',
  '  if (!g) { try { g = (function () { return this; })(); } catch (e2) {} }',
  '  if (!g || !g.String || !g.String.prototype) return;',
  '  var p = g.String.prototype;',
  '  if (typeof p.trim !== "function") { p.trim = function () { return ESSTR.trim(this); }; }',
  '  if (typeof p.trimLeft !== "function") { p.trimLeft = function () { return ESSTR.trimLeft(this); }; }',
  '  if (typeof p.trimRight !== "function") { p.trimRight = function () { return ESSTR.trimRight(this); }; }',
  '  if (typeof p.trimStart !== "function") { p.trimStart = function () { return ESSTR.trimStart(this); }; }',
  '  if (typeof p.trimEnd !== "function") { p.trimEnd = function () { return ESSTR.trimEnd(this); }; }',
  '})();',
  ''
].join('\n');

var vendor = finalJsx + '\n' + footer;
writeFileSync(join(DIST, 'vendor-esstr.js'), vendor);

// 4. Runtime-only vendor: tree-shaken methods core for per-eval injection.
var runtimeJsx = join(DIST, 'ESSTR-runtime.jsx');
jsxBuild(join(ROOT, 'src', 'runtime.ts'), runtimeJsx);
var runtimeFinal = shim + readFileSync(runtimeJsx, 'utf8');
runtimeFinal = runtimeFinal.replace(/"use strict";?/g, '');
var runtimeVendor = runtimeFinal + '\n' + footer;
writeFileSync(join(DIST, 'vendor-esstr-runtime.js'), runtimeVendor);

// 5. Accelerated self-extracting bundle (ESSTR.accel.jsx): CURRENT merge spec.
//    Do NOT embed ESCHARS.accel.jsx as a string: that would nest an ESPAK
//    loader and double-carry ESB64Native. Instead, espack-merge combines the
//    ESSTRTrim and ESChars manifests into ONE loader with ONE shared accel and
//    flat payloads, then the loader-free ESCHARS facade and ESSTR facade are
//    appended. ESSTR consumes $.global.ESCHARS when present.
var ACCELERATOR = [
  '',
  '(function () {',
  '  if (typeof ESPAK !== "object" || !ESPAK || typeof ESPAK.load !== "function") return;',
  '  if (typeof ESSTR !== "object" || !ESSTR || typeof ESSTR.enableNativeGate !== "function") return;',
  '  var cached = null;',
  '  function useEspack() {',
  '    var l = ESPAK.load("ESSTRTrim");',
  '    if (!l.ok || l.mode !== "native" || !l.lib) {',
  '      cached = { ok: false, reason: (l && l.error) || "ESPAK load failed" };',
  '      return cached;',
  '    }',
  '    var caps = ESSTR.enableNativeGate({ lib: l.lib, dllPath: l.path });',
  '    cached = { ok: caps.enabled === true, caps: caps, path: l.path };',
  '    return cached;',
  '  }',
  '  ESSTR.useEspack = useEspack;',
  '  ESSTR.espack = useEspack();',
  '  if (typeof ESSTR.enableEschars === "function") {',
  '    try { ESSTR.enableEschars(); ESSTR.eschars = ESSTR.escharsStatus(); } catch (e3) { ESSTR.eschars = { loaded: false, reason: String(e3) }; }',
  '  }',
  '  var g = null;',
  '  try { if (typeof $ !== "undefined" && $.global) { g = $.global; } } catch (e1) {}',
  '  if (g) {',
  '    g.ESSTR = ESSTR;',
  '    g.ESPAK = ESPAK;',
  '  }',
  '}());',
  ''
].join('\n');

function minifyAccel(accelOut, skillVendor) {
  var skillDir = join(ROOT, '..', 'agent-skills', 'adobe-extendscript-minification');
  var minifyScript = join(skillDir, 'scripts', 'minify-jsx.py');
  var minifyConfig = join(skillDir, 'configs', 'conservative.json');
  if (!existsSync(minifyScript) || !existsSync(minifyConfig)) {
    console.log('[esstr-build] accel minify skipped: minification skill not found at ' + skillDir);
    return;
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
  if (skillVendor && existsSync(skillVendor)) {
    writeFileSync(join(skillVendor, 'ESSTR.accel.min.jsx'), minOut);
    console.log('[esstr-build] vendored ESSTR.accel.min.jsx -> ' + join(skillVendor, 'ESSTR.accel.min.jsx'));
  }
  console.log('[esstr-build] wrote ' + minFinal + ' (' + minOut.length + ' bytes, banner preserved)');
}

function buildAccel() {
  var espackBuild = join(ROOT, '..', 'espack', 'espack-build.mjs');
  var espackMerge = join(ROOT, '..', 'espack', 'espack-merge.mjs');
  var dll = join(ROOT, 'native', 'bin', 'ESSTRTrim.dll');
  var escharsManifest = join(ROOT, '..', 'eschars', 'dist', 'ESCHARS.manifest.json');
  var escharsFacade = join(ROOT, '..', 'eschars', 'dist', 'ESCHARS.facade.jsx');
  var missing = [];
  if (!existsSync(espackBuild)) { missing.push('espack-build.mjs (sibling espack repo)'); }
  if (!existsSync(espackMerge)) { missing.push('espack-merge.mjs (sibling espack repo)'); }
  if (!existsSync(dll)) { missing.push(dll + ' (run npm run native-build)'); }
  if (!existsSync(escharsManifest)) { missing.push('eschars/dist/ESCHARS.manifest.json (run npm run build:native && npm run build:accel in ../eschars)'); }
  if (!existsSync(escharsFacade)) { missing.push('eschars/dist/ESCHARS.facade.jsx (run npm run build:accel in ../eschars)'); }
  if (missing.length > 0) {
    console.error('[esstr-build] accel build requires merged ESCHARS + ESSTR manifests; missing: ' + missing.join(', '));
    process.exit(1);
  }
  var esstrScratchBundle = join(DIST, '.esstr-trim-scratch.jsx');
  var esstrManifest = join(DIST, '.ESSTRTrim.manifest.json');
  execFileSync(process.execPath, [espackBuild, '--embed', dll, '--out', esstrScratchBundle,
    '--name', 'esstr', '--manifest-out', esstrManifest, '--quiet'], { stdio: 'inherit' });
  var mergedLoader = join(DIST, '.esstr-merged-loader.jsx');
  var mergedManifest = join(DIST, 'ESSTR.manifest.json');
  execFileSync(process.execPath, [espackMerge, '--merge', esstrManifest, escharsManifest,
    '--out', mergedLoader, '--name', 'esstr', '--manifest-out', mergedManifest, '--quiet'], { stdio: 'inherit' });
  var loaderText = readFileSync(mergedLoader, 'utf8');
  var escharsFacadeText = readFileSync(escharsFacade, 'utf8');
  var facadeText = readFileSync(join(DIST, 'ESSTR.jsx'), 'utf8');
  var facadeOut = facadeText + '\n' + ACCELERATOR +
    '// ESSTR.facade.jsx - loader-free facade + espack adapter (requires ESPAK on $.global)\n';
  writeFileSync(join(DIST, 'ESSTR.facade.jsx'), facadeOut);
  var accelOut = loaderText + '\n' + escharsFacadeText + '\n' + facadeText + '\n' + ACCELERATOR +
    '// ESSTR.accel.jsx - MERGED accel (espack-merge: ESSTRTrim + ESChars manifests -> ONE loader, ONE shared ESB64Native accel, flat payloads; ESCHARS facade + ESSTR facade appended; NO nested ESPAK bundle)\n';
  writeFileSync(join(DIST, 'ESSTR.accel.jsx'), accelOut);
  var skillVendor = join(ROOT, '..', 'agent-skills', 'illustrator-com-automation-skill', 'vendor');
  if (existsSync(skillVendor)) {
    writeFileSync(join(skillVendor, 'ESSTR.accel.jsx'), accelOut);
    console.log('[esstr-build] vendored ESSTR.accel.jsx -> ' + join(skillVendor, 'ESSTR.accel.jsx'));
  }
  console.log('[esstr-build] wrote ' + join(DIST, 'ESSTR.accel.jsx') + ' (' + accelOut.length + ' bytes)');
  minifyAccel(accelOut, skillVendor);
}

if (process.argv.includes('--accel')) {
  buildAccel();
}

console.log('[esstr-build] wrote ' + join(DIST, 'ESSTR.jsx') + ', ' + join(DIST, 'vendor-esstr.js') + ', ' +
  join(DIST, 'vendor-esstr-runtime.js') + ' and ' + join(DIST, 'esstr-core.esm.mjs'));
