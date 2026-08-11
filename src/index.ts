// ESSTR facade — String whitespace methods for ExtendScript (ES3).
//
// Pure-function API (string first) so the identical bundle runs in Node:
//   ESSTR.trim(s)        — strip WhiteSpace + LineTerminator (+ FEFF) both ends
//   ESSTR.trimLeft(s)    — leading only
//   ESSTR.trimRight(s)   — trailing only
//   ESSTR.trimStart(s)   — alias of trimLeft (ES2019 naming)
//   ESSTR.trimEnd(s)     — alias of trimRight (ES2019 naming)
// Plus: capabilities() (native-vs-missing census), install() (gap-fill
// prototype install, true-polyfill semantics), benchmark().
//
// All methods are ToString-based (spec 15.5.4.20): they never throw and work
// on any input, exactly like Node's native trim.
import { BenchItem, CapabilityReport, InstallOptions } from './types';
import { trim, trimLeft, trimRight, trimStart, trimEnd, clearMemo } from './string-core';
import { enableNativeGate, disableNativeGate, nativeGateStatus } from './native-lane';
import { enableEschars, disableEschars, escharsStatus } from './eschars-lane';

export { trim, trimLeft, trimRight, trimStart, trimEnd, clearMemo };
export { enableNativeGate, disableNativeGate, nativeGateStatus };
export { enableEschars, disableEschars, escharsStatus };

function globalObject(): any {
  if (typeof $ !== 'undefined' && $.global) {
    try { return $.global; } catch (e) { /* ignore */ }
  }
  try {
    return Function('return this')();
  } catch (e2) {
    return null;
  }
}

var PROTOTYPE_NAMES: string[] = ['trim', 'trimLeft', 'trimRight', 'trimStart', 'trimEnd'];

// Prototype wrappers forward `this` (a primitive string or String object;
// the core ToStrings it, so String.prototype.trim.call(123) === '123').
function makePrototypeWrapper(name: string, fn: (s: any) => string): (this: any) => string {
  return function (this: any): string {
    return fn(this);
  };
}

export function capabilities(scope?: any): CapabilityReport {
  var g = scope || globalObject();
  var nativeList: string[] = [];
  var missing: string[] = [];
  var i = 0;
  var proto: any = g && g.String && g.String.prototype ? g.String.prototype : null;
  for (i = 0; i < PROTOTYPE_NAMES.length; i++) {
    if (proto && typeof proto[PROTOTYPE_NAMES[i]] === 'function') {
      nativeList[nativeList.length] = PROTOTYPE_NAMES[i];
    } else {
      missing[missing.length] = PROTOTYPE_NAMES[i];
    }
  }
  var engine = '';
  try {
    if (typeof $ !== 'undefined' && $.version) { engine = String($.version); }
  } catch (e) { /* ignore */ }
  return { engine: engine, nativeList: nativeList, missing: missing };
}

export function install(options?: InstallOptions): CapabilityReport {
  var g = globalObject();
  var force = !!(options && options.forceReplace);
  var before = capabilities(g);
  var i = 0;
  if (g && g.String && g.String.prototype) {
    for (i = 0; i < PROTOTYPE_NAMES.length; i++) {
      var name = PROTOTYPE_NAMES[i];
      if (force || typeof g.String.prototype[name] !== 'function') {
        try {
          g.String.prototype[name] = makePrototypeWrapper(name, wrapperOf(name));
        } catch (e) {
          // best-effort per method
        }
      }
    }
  }
  return before;
}

function wrapperOf(name: string): (s: any) => string {
  switch (name) {
    case 'trim': return trim;
    case 'trimLeft': return trimLeft;
    case 'trimRight': return trimRight;
    case 'trimStart': return trimStart;
    case 'trimEnd': return trimEnd;
    default: return trim;
  }
}

// ---- in-module quick benchmark (hires timer when present) -------------------

function nowUs(): number {
  if (typeof $ !== 'undefined' && $.hiresTimer) {
    return $.hiresTimer;
  }
  return Date.now() * 1000;
}

function timeLane(fn: () => void, iterations: number): number[] {
  var samples: number[] = [];
  var i = 0;
  var d = 0;
  for (i = 0; i < iterations; i++) {
    // $.hiresTimer returns microseconds SINCE ITS PREVIOUS ACCESS: prime it
    // immediately before the measured op, read once afterward (the read IS
    // the duration). Reject wrap-corrupted samples.
    $.hiresTimer;
    fn();
    d = $.hiresTimer;
    if (d > 0 && d < 10000000) {
      samples[samples.length] = d;
    }
  }
  return samples;
}

function median(samples: number[]): number {
  var s = samples.slice(0);
  s.sort(function (a: number, b: number): number { return a - b; });
  return s[Math.floor(s.length / 2)];
}

function item(laneName: string, n: number, iterations: number, samples: number[]): BenchItem {
  var sorted = samples.slice(0);
  sorted.sort(function (a: number, b: number): number { return a - b; });
  var medianUs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return {
    lane: laneName,
    n: n,
    iterations: iterations,
    medianUs: medianUs,
    minUs: sorted.length ? sorted[0] : 0,
    p95Us: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0,
    elemUs: n > 0 ? medianUs / n : 0
  };
}

export function benchmark(n?: number, iterations?: number): BenchItem[] {
  var size = n || 64;
  var it = iterations || 9;
  var plain = 'the quick brown fox jumps over the lazy dog';
  var padded = '  \t' + plain + '\r\n ';
  var out: BenchItem[] = [];
  out[out.length] = item('trim-plain', plain.length, it, timeLane(function (): void { trim(plain); }, it));
  out[out.length] = item('trim-padded', padded.length, it, timeLane(function (): void { trim(padded); }, it));
  out[out.length] = item('trim-left-padded', padded.length, it, timeLane(function (): void { trimLeft(padded); }, it));
  out[out.length] = item('trim-right-padded', padded.length, it, timeLane(function (): void { trimRight(padded); }, it));
  return out;
}
