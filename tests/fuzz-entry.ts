// ESSTR seeded differential fuzz: random (op, string) pairs run against both
// the bundled core and Node's native String trim methods; any divergence
// fails. Harness bookkeeping uses esarr (dogfooding the family).
import * as core from '../src/index';
import * as ESARR from 'esarr';

function mulberry32(seed: number): () => number {
  var a = seed >>> 0;
  return function (): number {
    a = (a + 0x6D2B79F5) | 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var NATIVE: any = {
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

export function fuzz(seed: number, iterations: number): number {
  var rnd = mulberry32(seed);
  var failures = 0;
  for (var it = 0; it < iterations; it++) {
    // random string: 70% pure charset, 30% heavy whitespace soup
    var len = (rnd() * 30) | 0;
    var wsHeavy = rnd() < 0.3;
    var s = '';
    var i = 0;
    for (i = 0; i < len; i++) {
      var idx = wsHeavy && rnd() < 0.6 ? 6 + ((rnd() * 28) | 0) : (rnd() * CHARSET.length) | 0;
      s += CHARSET[idx];
    }
    var op = OPS[(rnd() * OPS.length) | 0];
    var ours: any;
    var theirs: any;
    var ourErr = false;
    var theirErr = false;
    try { ours = (core as any)[op](s); } catch (e) { ourErr = true; }
    try { theirs = (NATIVE as any)[op].call(s); } catch (e) { theirErr = true; }
    if (ourErr !== theirErr || (!ourErr && ours !== theirs)) {
      console.error('fuzz[' + it + '] ' + op + ': ours=' + JSON.stringify(ours) + ' native=' + JSON.stringify(theirs) + ' on ' + JSON.stringify(s));
      failures++;
      if (failures > 5) { return failures; }
    }
  }
  return failures;
}
