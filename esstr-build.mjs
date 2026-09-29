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
import { execFileSync, spawnSync } from 'node:child_process';
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

function resolvePython() {
  if (process.env.ESSTR_PYTHON) return { command: process.env.ESSTR_PYTHON, prefix: [] };
  var candidates = process.platform === 'win32'
    ? [
        { command: 'py.exe', prefix: ['-3'] },
        { command: 'python.exe', prefix: [] },
        { command: 'python3.exe', prefix: [] }
      ]
    : [
        { command: 'python3', prefix: [] },
        { command: 'python', prefix: [] }
      ];
  for (var i = 0; i < candidates.length; i++) {
    var probe = spawnSync(candidates[i].command, candidates[i].prefix.concat(['--version']), {
      cwd: ROOT,
      stdio: 'ignore'
    });
    if (!probe.error && probe.status === 0) return candidates[i];
  }
  throw new Error('Python 3 interpreter not found; set ESSTR_PYTHON to an executable path');
}
var PYTHON = resolvePython();

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

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (ignore) {
    return '';
  }
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
  execFileSync(PYTHON.command, PYTHON.prefix.concat([
    minifyScript, '--in', bodyPath, '--config', minifyConfig, '--out', minPath
  ]), { stdio: 'inherit' });
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

async function buildAccel() {
  var espackBuild = join(ROOT, '..', 'espack', 'espack-build.mjs');
  var espackMerge = join(ROOT, '..', 'espack', 'espack-merge.mjs');
  var espackLibraries = join(ROOT, '..', 'espack', 'espack-libraries.mjs');
  var dll = join(ROOT, 'native', 'bin', 'ESSTRTrim.dll');
  var escharsManifest = join(ROOT, '..', 'eschars', 'dist', 'ESCHARS.manifest.json');
  var missing = [];
  if (!existsSync(espackBuild)) { missing.push('espack-build.mjs (sibling espack repo)'); }
  if (!existsSync(espackMerge)) { missing.push('espack-merge.mjs (sibling espack repo)'); }
  if (!existsSync(espackLibraries)) { missing.push('espack-libraries.mjs (sibling espack repo)'); }
  if (!existsSync(dll)) { missing.push(dll + ' (run npm run native-build)'); }
  if (!existsSync(escharsManifest)) { missing.push('eschars/dist/ESCHARS.manifest.json (run npm run build:accel in ../eschars)'); }
  if (missing.length > 0) {
    console.error('[esstr-build] accel build requires ESPACK v2 + ESCHARS v2 inputs; missing: ' + missing.join(', '));
    process.exit(1);
  }

  var packageInfo = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  var escharsPackage = JSON.parse(readFileSync(join(ROOT, '..', 'eschars', 'package.json'), 'utf8'));
  var buildApi = await import(new URL('../espack/espack-build.mjs', import.meta.url).href);
  var mergeApi = await import(new URL('../espack/espack-merge.mjs', import.meta.url).href);
  var libraries = await import(new URL('../espack/espack-libraries.mjs', import.meta.url).href);
  var payload = readFileSync(dll);
  var library = libraries.libraryFromFile({
    id: 'esstr',
    version: packageInfo.version,
    global: 'ESSTR',
    path: join(DIST, 'ESSTR.facade.jsx'),
    requires: [{ id: 'eschars', range: '^' + escharsPackage.version }],
    contract: [
      { name: 'trim', type: 'function' },
      { name: 'trimLeft', type: 'function' },
      { name: 'trimRight', type: 'function' },
      { name: 'enableNativeGate', type: 'function' },
      { name: 'enableEschars', type: 'function' }
    ],
    provenance: {
      package: packageInfo.name,
      repository: packageInfo.repository && packageInfo.repository.url,
      commit: gitHead(),
      artifact: 'dist/ESSTR.facade.jsx'
    }
  });
  var ownManifest = buildApi.makeManifest({
    bundleName: 'esstr',
    cacheDir: '',
    payloads: [{
      name: 'ESSTRTrim',
      version: '1',
      len: payload.length,
      b64: payload.toString('base64'),
      fileName: 'ESSTRTrim_v1.dll'
    }],
    accel: null,
    libraries: [library],
    entries: [{ id: 'esstr', range: '=' + packageInfo.version }],
    capabilities: [{
      id: 'esstr.native',
      provider: 'esstr',
      mode: 'optional',
      payloads: ['ESSTRTrim'],
      accel: null
    }]
  });
  var composed = mergeApi.merge({
    manifests: [escharsManifest, ownManifest],
    out: join(DIST, 'ESSTR.accel.jsx'),
    manifestOut: join(DIST, 'ESSTR.manifest.json'),
    name: 'esstr',
    entries: [{ id: 'esstr', range: '=' + packageInfo.version }],
    deferB64: true
  });
  var accelOut = composed.text +
    '// ESSTR.accel.jsx - ESPACK v2 flattened ESB64 -> ESCHARS -> ESSTR composition; one loader/control plane\n';
  writeFileSync(join(DIST, 'ESSTR.accel.jsx'), accelOut);
  console.log('[esstr-build] wrote ' + join(DIST, 'ESSTR.accel.jsx') + ' (' + accelOut.length + ' bytes)');
  estcCheck('dist/ESSTR.accel.jsx');
  minifyAccel(accelOut);
  if (WANT_VENDOR) { vendorAccel(VENDOR_DIR); }
}

if (process.argv.includes('--accel')) {
  await buildAccel();
} else if (WANT_VENDOR) {
  console.error('[esstr-build] --vendor requires --accel (only accel artifacts are vendored)');
  process.exit(1);
}

console.log('[esstr-build] ESTC canonical build complete: ' + join(DIST, 'ESSTR.jsx') + ', ' +
  join(DIST, 'vendor-esstr.js') + ', ' + join(DIST, 'ESSTR-runtime.jsx') + ', ' +
  join(DIST, 'vendor-esstr-runtime.js') + ', ' + join(DIST, 'esstr-core.esm.mjs'));
