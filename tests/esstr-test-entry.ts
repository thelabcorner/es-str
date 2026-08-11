// ESSTR Node conformance: runs the shared vectors against the bundled core
// and a randomized differential sweep vs Node's native String.prototype
// trim/trimLeft/trimRight/trimStart/trimEnd (the oracle). Harness
// bookkeeping uses the esarr library (dogfooding the family).
import * as core from '../src/index';
import * as ESARR from 'esarr';
import { VECTORS } from './vectors';
import { runVector } from './callbacks';

var failures: string[] = [];
var passed = 0;

function check(desc: string, actual: any, expected: any): void {
  if (actual === expected) {
    passed++;
  } else {
    failures[failures.length] = desc + ': expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual);
  }
}

// ---- 1. shared vectors against the core ----
ESARR.forEach(VECTORS, function (vec: any): void {
  var out = runVector(vec, core);
  if (vec.expect === 'TypeError') {
    if (!out.ok && String(out.result).indexOf('TypeError') >= 0) { passed++; }
    else { failures[failures.length] = vec.desc + ': expected TypeError, got ' + String(out.result); }
    return;
  }
  if (!out.ok) {
    failures[failures.length] = vec.desc + ': ' + String(out.result);
    return;
  }
  check(vec.desc, out.result, vec.expect);
});

// ---- 2. differential vs Node natives (spec oracle) ----
var NATIVE = {
  trim: String.prototype.trim,
  trimLeft: String.prototype.trimLeft,
  trimRight: String.prototype.trimRight,
  trimStart: String.prototype.trimStart,
  trimEnd: String.prototype.trimEnd
};

var CHARSET: string[] = [
  'a', 'b', 'z', 'A', '0', '9', '_', '-', '.', ' ',
  '\t', '\n', '\r', '\u000b', '\u000c', '\u00a0',
  '\u1680', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005',
  '\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u2028', '\u2029',
  '\u202f', '\u205f', '\u3000', '\ufeff',
  '\u0085', '\u200b', '\u180e', '\u0000', '\u0001',
  '\u00e9', '\u65e5', '\u672c', '\ud83d\ude00', '\ud800', '\udc00'
];
var OPS = ['trim', 'trimLeft', 'trimRight', 'trimStart', 'trimEnd'];

function randomString(): string {
  var len = (Math.random() * 24) | 0;
  var out = '';
  var i = 0;
  for (i = 0; i < len; i++) {
    out += CHARSET[(Math.random() * CHARSET.length) | 0];
  }
  return out;
}

var DIFF_ITERS = 20000;
for (var di = 0; di < DIFF_ITERS; di++) {
  var s = randomString();
  var op = OPS[(Math.random() * OPS.length) | 0];
  var ours = (core as any)[op](s);
  var theirs = (NATIVE as any)[op].call(s);
  if (ours !== theirs) {
    failures[failures.length] = 'diff[' + di + '] ' + op + ': ours=' + JSON.stringify(ours) +
      ' native=' + JSON.stringify(theirs) + ' on ' + JSON.stringify(s);
    if (failures.length > 40) { break; }
  }
  passed++;
}

// ---- 3. ToString coercion differential ----
var COERCE: any[] = [123, 0, -7, 3.14, true, false, 'x', new String(' y '), { toString: function (): string { return '  z  '; } }];
ESARR.forEach(COERCE, function (v2: any): void {
  var ours = core.trim(v2);
  var theirs = NATIVE.trim.call(v2);
  check('coerce ' + String(v2), ours, theirs);
});
// null/undefined: BOTH must throw (V8 semantics — the differential oracle)
[null, undefined].forEach(function (v3: any): void {
  var ourThrew = false, theirThrew = false;
  try { core.trim(v3); } catch (e) { ourThrew = true; }
  try { NATIVE.trim.call(v3); } catch (e) { theirThrew = true; }
  if (ourThrew !== theirThrew) {
    failures[failures.length] = 'null/undefined trim: ours threw=' + ourThrew + ' native threw=' + theirThrew;
  } else {
    passed++;
  }
});

// ---- 4. unchanged-result identity (fast path returns the same string) ----
var clean = 'plain text';
if (core.trim(clean) !== clean) { failures[failures.length] = 'trim identity: fast path must return the input string'; }
else { passed++; }

if (failures.length > 0) {
  console.error('ESSTR TEST FAILURES (' + failures.length + '):');
  for (var f = 0; f < failures.length && f < 25; f++) {
    console.error('  ' + failures[f]);
  }
  throw new Error(failures.length + ' ESSTR test failure(s)');
}
console.log('ESSTR tests: ' + passed + ' checks passed (' + VECTORS.length + ' vectors + ' + DIFF_ITERS + ' differential + ' + COERCE.length + ' coercion)');
