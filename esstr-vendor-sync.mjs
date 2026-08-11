#!/usr/bin/env node
// ESSTR vendor-sync guard — the vendored accelerator artifacts
// (agent-skills/illustrator-com-automation-skill/vendor/ESSTR.accel*.jsx) must
// match the upstream dist build byte-for-byte, or skill consumers may embed a
// stale bundle. Mirrors the ESARR guard, extended to check the minified bundle.
//
// Usage:
//   node esstr-vendor-sync.mjs            # sync: copy dist -> vendor
//   node esstr-vendor-sync.mjs --check    # verify byte-identical
//   node esstr-vendor-sync.mjs --check --quiet
//
// Graceful-pending rule: until dist/ESSTR.accel.jsx exists, --check reports
// PENDING (exit 0) so the pure-JS test loop stays green before native assets
// have been built. Once any dist accel artifact exists, its vendored copy is
// enforced strictly.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var VENDOR_DIR = join(ROOT, '..', 'agent-skills', 'illustrator-com-automation-skill', 'vendor');
var PAIRS = [
  ['ESSTR.accel.jsx', join(ROOT, 'dist', 'ESSTR.accel.jsx'), join(VENDOR_DIR, 'ESSTR.accel.jsx')],
  ['ESSTR.accel.min.jsx', join(ROOT, 'dist', 'ESSTR.accel.min.jsx'), join(VENDOR_DIR, 'ESSTR.accel.min.jsx')]
];

var args = process.argv.slice(2);
var mode = args.indexOf('--check') >= 0 ? 'check' : 'sync';
var quiet = args.indexOf('--quiet') >= 0;

function say(s) {
  if (!quiet) { console.log(s); }
}

function pendingCount() {
  var n = 0;
  for (var i = 0; i < PAIRS.length; i++) {
    if (!existsSync(PAIRS[i][1])) { n++; }
  }
  return n;
}

if (pendingCount() === PAIRS.length) {
  say('[esstr-vendor-sync] PENDING: dist/ESSTR.accel*.jsx not built yet — ' +
    (mode === 'check' ? 'nothing to verify' : 'nothing to sync'));
  process.exit(0);
}
if (!existsSync(VENDOR_DIR)) {
  console.error('[esstr-vendor-sync] FAIL: vendor dir missing: ' + VENDOR_DIR);
  process.exit(1);
}

for (var i = 0; i < PAIRS.length; i++) {
  var label = PAIRS[i][0];
  var dist = PAIRS[i][1];
  var vendor = PAIRS[i][2];
  if (!existsSync(dist)) {
    console.error('[esstr-vendor-sync] FAIL: missing dist artifact: ' + dist);
    process.exit(1);
  }
  var distBytes = readFileSync(dist);
  if (mode === 'sync') {
    writeFileSync(vendor, distBytes);
    say('[esstr-vendor-sync] synced ' + label + ' (' + distBytes.length + ' bytes)');
    continue;
  }
  if (!existsSync(vendor)) {
    console.error('[esstr-vendor-sync] FAIL: vendor/' + label + ' is missing while dist has a bundle — run node esstr-vendor-sync.mjs');
    process.exit(1);
  }
  var vendorBytes = readFileSync(vendor);
  if (distBytes.length !== vendorBytes.length || !distBytes.equals(vendorBytes)) {
    console.error('[esstr-vendor-sync] FAIL: vendor/' + label + ' (' + vendorBytes.length + ' bytes) diverges from dist/' + label + ' (' + distBytes.length + ' bytes) — run node esstr-vendor-sync.mjs');
    process.exit(1);
  }
  say('[esstr-vendor-sync] ok: vendor/' + label + ' matches dist byte-for-byte (' + distBytes.length + ' bytes)');
}
process.exit(0);
