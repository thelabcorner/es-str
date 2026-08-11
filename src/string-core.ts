// ESSTR core — ES5.1 §15.5.4.20 TrimString + the ES2019 trimStart/trimEnd
// naming, spec-exact, tuned to the measured behavior of the Adobe
// ExtendScript engine (SpiderMonkey ES3, Illustrator 30.6.0 / ExtendScript
// 4.5.6).
//
// Whitespace semantics follow the modern trim (V8/Node oracle): WhiteSpace +
// LineTerminator INCLUDING U+FEFF (ES6+). Verified live on this engine:
//   - The engine's regex \s is WRONG in both directions: it does NOT match
//     U+FEFF and DOES match U+180E (which modern trim KEEPS). The stock
//     regex shim is therefore spec-incorrect here — and WORSE: anchored
//     whitespace regexes WEDGE the engine from ~200 chars up (verified
//     repeatedly; the skill documents the same class of anchored-regex
//     hangs). Regex is banned; ESSTR scans with charCodeAt, the only
//     engine-safe code-unit reader (charAt returns "" for U+0000).
//   - The per-char cost is charCodeAt (~1 us) + the whitespace comparisons.
//     The comparisons are INLINED in the scan loops (a helper call per char
//     measured slower) and ordered by observed frequency. Every high-range
//     check is an explicit if-statement: this engine MISCOMPILES mixed
//     &&/|| chains once a bundler strips the parens (verified live — the
//     whole chain then evaluates false).
//   - The identity fast path falls out of the scan structure for free:
//     wsStart stops at the first non-ws char, wsEnd at the last; when both
//     are the string edges, the input string is returned unchanged (V8
//     does the same; Node's trim() === s is true for clean input).
//   - A small LRU memo (family pattern: esb64's payload memo) makes
//     repeated strings ~free: real workloads re-trim the same values
//     (settings keys, CSV fields, SVG attributes). Keys are ' '-prefixed so
//     no object-inherited property (constructor, __proto__, ...) can ever
//     collide. Strings > 256 chars skip the memo (rarely repeated, bounds
//     memory).
//   - String.prototype.trim is ToString-based: numbers/booleans/String
//     objects coerce; null/undefined throw TypeError (matching Node). The
//     facade therefore guards null/undefined and ToStrings its argument.
import { nativeTrim } from './native-lane';
import { escharsTrim } from './eschars-lane';

var MEMO_MAX_LEN = 256;
var MEMO_LIMIT = 8;

// memo arrays: [0] = map (string-keyed object), [1] = insertion-order keys.
var trimMemo: any[] = [{}, []];
var leftMemo: any[] = [{}, []];
var rightMemo: any[] = [{}, []];

function memoRead(memo: any[], s: string): any {
  return memo[0][' ' + s];
}

function memoWrite(memo: any[], s: string, v: string): string {
  var key = ' ' + s;
  memo[0][key] = v;
  var keys = memo[1];
  keys[keys.length] = key;
  if (keys.length > MEMO_LIMIT) {
    delete memo[0][keys[0]];
    keys.shift();
  }
  return v;
}

export function clearMemo(): void {
  trimMemo[0] = {};
  trimMemo[1] = [];
  leftMemo[0] = {};
  leftMemo[1] = [];
  rightMemo[0] = {};
  rightMemo[1] = [];
}

export function trim(s: any): string {
  if (s === null || s === void 0) {
    throw new TypeError('String.prototype.trim called on null or undefined');
  }
  s = String(s);
  var len = s.length;
  if (len === 0) {
    return s;
  }
  var nr = nativeTrim(s, 0);
  if (nr !== void 0) {
    return nr;
  }
  nr = escharsTrim(s, 0);
  if (nr !== void 0) {
    return nr;
  }
  if (len <= MEMO_MAX_LEN) {
    var hit = memoRead(trimMemo, s);
    if (hit !== void 0) {
      return hit;
    }
    return memoWrite(trimMemo, s, trimCore(s));
  }
  return trimCore(s);
}

export function trimLeft(s: any): string {
  if (s === null || s === void 0) {
    throw new TypeError('String.prototype.trimLeft called on null or undefined');
  }
  s = String(s);
  var len = s.length;
  if (len === 0) {
    return s;
  }
  var nr = nativeTrim(s, 1);
  if (nr !== void 0) {
    return nr;
  }
  nr = escharsTrim(s, 1);
  if (nr !== void 0) {
    return nr;
  }
  if (len <= MEMO_MAX_LEN) {
    var hit = memoRead(leftMemo, s);
    if (hit !== void 0) {
      return hit;
    }
    return memoWrite(leftMemo, s, trimLeftCore(s));
  }
  return trimLeftCore(s);
}

export function trimRight(s: any): string {
  if (s === null || s === void 0) {
    throw new TypeError('String.prototype.trimRight called on null or undefined');
  }
  s = String(s);
  var len = s.length;
  if (len === 0) {
    return s;
  }
  var nr = nativeTrim(s, 2);
  if (nr !== void 0) {
    return nr;
  }
  nr = escharsTrim(s, 2);
  if (nr !== void 0) {
    return nr;
  }
  if (len <= MEMO_MAX_LEN) {
    var hit = memoRead(rightMemo, s);
    if (hit !== void 0) {
      return hit;
    }
    return memoWrite(rightMemo, s, trimRightCore(s));
  }
  return trimRightCore(s);
}

// ES2019 naming — aliases of the ES5-era trimLeft/trimRight (Node has both).
export function trimStart(s: any): string {
  return trimLeft(s);
}

export function trimEnd(s: any): string {
  return trimRight(s);
}

function trimCore(s: string): string {
  var len = s.length;
  var st = wsStart(s, len);
  if (st === len) {
    return '';
  }
  var en = wsEnd(s, len - 1, st);
  if (st === 0 && en === len - 1) {
    return s;
  }
  return s.substring(st, en + 1);
}

function trimLeftCore(s: string): string {
  var st = wsStart(s, s.length);
  if (st === 0) {
    return s;
  }
  return s.substring(st);
}

function trimRightCore(s: string): string {
  var len = s.length;
  var en = wsEnd(s, len - 1, 0);
  if (en === len - 1) {
    return s;
  }
  return s.substring(0, en + 1);
}

// Leading whitespace run: returns the index of the first non-ws char (len if
// all whitespace). Comparisons are INLINED (per-char helper calls measured
// slower) and ordered by observed frequency; the high-range checks are
// explicit ifs — bundler-proof against the engine's mixed-chain miscompile.
function wsStart(s: string, len: number): number {
  var st = 0;
  var cc = 0;
  while (st < len) {
    cc = s.charCodeAt(st);
    if (cc === 32 || cc === 9 || cc === 10 || cc === 13 || cc === 11 || cc === 12 || cc === 160) {
      st++;
      continue;
    }
    if (cc < 256) {
      break;
    }
    if (cc === 0x1680) { st++; continue; }
    if (cc === 0x2028) { st++; continue; }
    if (cc === 0x2029) { st++; continue; }
    if (cc === 0x202F) { st++; continue; }
    if (cc === 0x205F) { st++; continue; }
    if (cc === 0x3000) { st++; continue; }
    if (cc === 0xFEFF) { st++; continue; }
    if (cc >= 0x2000 && cc <= 0x200A) { st++; continue; }
    break;
  }
  return st;
}

// Trailing whitespace run: scans down from `from` (len - 1) to `floor`
// (the start-scan bound or 0), returning the last non-ws index.
function wsEnd(s: string, from: number, floor: number): number {
  var en = from;
  var cc = 0;
  while (en >= floor) {
    cc = s.charCodeAt(en);
    if (cc === 32 || cc === 9 || cc === 10 || cc === 13 || cc === 11 || cc === 12 || cc === 160) {
      en--;
      continue;
    }
    if (cc < 256) {
      break;
    }
    if (cc === 0x1680) { en--; continue; }
    if (cc === 0x2028) { en--; continue; }
    if (cc === 0x2029) { en--; continue; }
    if (cc === 0x202F) { en--; continue; }
    if (cc === 0x205F) { en--; continue; }
    if (cc === 0x3000) { en--; continue; }
    if (cc === 0xFEFF) { en--; continue; }
    if (cc >= 0x2000 && cc <= 0x200A) { en--; continue; }
    break;
  }
  return en;
}
