// ESSTR ESCHARS lane — optional sibling facade resolver.
//
// This mirrors the sibling-facade pattern: the accelerated ESSTR build appends
// ESCHARS' loader-free facade after espack-merge, while a host may also have a
// global ESCHARS facade already. ESSTRTrim.dll remains the first/native trim
// acceleration path; ESCHARS is a second-choice long-edge fallback for the
// otherwise pure ES3 scanner when a future ESChars.dll exposes trimModern*.
//
// The current ESCHARS packBytes lane is intentionally NOT used for trim: it is
// byte-oriented and loses to both native lanes for padded strings, while ESSTR's
// pure scanner wins clean strings by exiting at the first non-whitespace edge.

var escharsFacade: any = null;
var escharsTrimLib: any = null;
var escharsTried = false;
var escharsDisabled = false;
var escharsReason = 'not tried';
var trimTried = false;
var trimReason = 'not tried';

var ESCHARS_TRIM_MIN_LEN = 257;
var SURROGATE_RE = /[\uD800-\uDFFF]/;

function sessionGlobal(): any {
  try { if (typeof $ !== 'undefined' && $.global) { return $.global; } } catch (e) {}
  try { return Function('return this')(); } catch (e2) { return null; }
}

function surfaceComplete(f: any): boolean {
  if (!f || typeof f.packBytes !== 'function') { return false; }
  try {
    return String(f.packBytes('')) === '';
  } catch (e) {
    return false;
  }
}

function trimSurfaceComplete(f: any): boolean {
  if (!f || typeof f.trimModern !== 'function' || typeof f.trimModernLeft !== 'function' || typeof f.trimModernRight !== 'function') {
    return false;
  }
  try {
    return String(f.trimModern(' x ')) === 'x' && String(f.trimModernLeft(' x ')) === 'x ' && String(f.trimModernRight(' x ')) === ' x';
  } catch (e) {
    return false;
  }
}

function resolveEschars(): any {
  if (escharsDisabled) { return null; }
  if (escharsTried) { return escharsFacade; }
  escharsTried = true;
  var sg = sessionGlobal();
  try {
    if (sg && surfaceComplete(sg.ESCHARS)) {
      escharsFacade = sg.ESCHARS;
      escharsReason = 'global';
      return escharsFacade;
    }
  } catch (e1) {}

  if (typeof ESCHARS_ACCEL_BUNDLE === 'string' && ESCHARS_ACCEL_BUNDLE.length > 0) {
    try {
      var dollar = (typeof $ !== 'undefined') ? $ : null;
      var stagedDollar = false;
      var savedGlobal = dollar ? dollar.global : null;
      var publishTarget = savedGlobal || sg;
      if (!publishTarget && typeof global !== 'undefined') {
        publishTarget = global;
      }
      if (publishTarget) {
        if (dollar) {
          try { dollar.global = publishTarget; } catch (e2) {}
        } else if (typeof global !== 'undefined') {
          try { global.$ = { global: publishTarget }; dollar = global.$; stagedDollar = true; } catch (e3) {}
        }
      }
      (0, eval)(ESCHARS_ACCEL_BUNDLE);
      if (publishTarget && surfaceComplete(publishTarget.ESCHARS)) {
        escharsFacade = publishTarget.ESCHARS;
        escharsReason = 'embedded';
      } else if (surfaceComplete((sessionGlobal() || {}).ESCHARS)) {
        escharsFacade = (sessionGlobal() || {}).ESCHARS;
        escharsReason = 'embedded-global';
      } else {
        escharsReason = 'embedded surface incomplete';
      }
      if (stagedDollar && typeof global !== 'undefined') {
        try { delete global.$; } catch (e4) { try { global.$ = undefined; } catch (e5) {} }
      } else if (dollar) {
        try { dollar.global = savedGlobal; } catch (e6) {}
      }
    } catch (e7) {
      escharsFacade = null;
      escharsReason = 'embedded eval failed: ' + String(e7);
    }
  } else {
    escharsReason = 'no embedded bundle';
  }
  return escharsFacade;
}

export function escharsStatus(): any {
  return {
    tried: escharsTried,
    loaded: !!escharsFacade,
    disabled: escharsDisabled,
    reason: escharsReason,
    trimTried: trimTried,
    trimLoaded: !!escharsTrimLib,
    trimReason: trimReason,
    trimMinLength: ESCHARS_TRIM_MIN_LEN
  };
}

export function disableEschars(): void {
  escharsDisabled = true;
  escharsFacade = null;
  escharsTrimLib = null;
  escharsReason = 'disabled';
  trimReason = 'disabled';
}

export function enableEschars(): any {
  escharsDisabled = false;
  escharsTried = false;
  trimTried = false;
  escharsFacade = null;
  escharsTrimLib = null;
  escharsReason = 'not tried';
  trimReason = 'not tried';
  return resolveEschars();
}

function resolveEscharsTrimLib(): any {
  if (escharsDisabled) { return null; }
  if (trimTried) { return escharsTrimLib; }
  trimTried = true;
  var sg = sessionGlobal();
  var f = resolveEschars();
  if (trimSurfaceComplete(f)) {
    escharsTrimLib = f;
    trimReason = 'facade';
    return escharsTrimLib;
  }
  if (sg && trimSurfaceComplete(sg.ESCHARS)) {
    escharsTrimLib = sg.ESCHARS;
    trimReason = 'global facade';
    return escharsTrimLib;
  }
  try {
    var espak = sg && sg.ESPAK ? sg.ESPAK : (typeof ESPAK !== 'undefined' ? ESPAK : null);
    if (espak && typeof espak.load === 'function') {
      var loaded = espak.load('ESChars');
      if (loaded && loaded.ok && trimSurfaceComplete(loaded.lib)) {
        escharsTrimLib = loaded.lib;
        trimReason = 'espak ESChars payload';
        return escharsTrimLib;
      }
      trimReason = 'ESPAK ESChars trim surface missing';
    } else {
      trimReason = 'no ESCHARS trim surface';
    }
  } catch (e) {
    trimReason = 'trim resolve failed: ' + String(e);
  }
  return null;
}

function modernWsCode(c: number): boolean {
  if (c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12 || c === 160) { return true; }
  if (c < 256) { return false; }
  if (c === 0x1680 || c === 0x2028 || c === 0x2029 || c === 0x202F || c === 0x205F || c === 0x3000 || c === 0xFEFF) { return true; }
  return c >= 0x2000 && c <= 0x200A;
}

function hasRelevantEdgeWhitespace(s: string, mode: number): boolean {
  var len = s.length;
  if (len === 0) { return false; }
  if (mode !== 2 && modernWsCode(s.charCodeAt(0))) { return true; }
  if (mode !== 1 && modernWsCode(s.charCodeAt(len - 1))) { return true; }
  return false;
}

function unsafeForNativeStringBoundary(s: string): boolean {
  if (s.indexOf(String.fromCharCode(0)) >= 0) { return true; }
  // Avoid the DLL path for lone-surrogate-sensitive strings. This regex is a
  // simple range scan, not the anchored whitespace regex class that wedges this
  // engine; it only runs after long-string + edge-whitespace checks pass.
  return SURROGATE_RE.test(s);
}

export function escharsTrim(s: string, mode: number): string | void {
  if (s.length < ESCHARS_TRIM_MIN_LEN) { return void 0; }
  if (!hasRelevantEdgeWhitespace(s, mode)) { return void 0; }
  if (unsafeForNativeStringBoundary(s)) { return void 0; }
  var lib = resolveEscharsTrimLib();
  if (!lib) { return void 0; }
  try {
    if (mode === 1) { return String(lib.trimModernLeft(s)); }
    if (mode === 2) { return String(lib.trimModernRight(s)); }
    return String(lib.trimModern(s));
  } catch (e) {
    trimReason = 'trim call failed: ' + String(e);
    return void 0;
  }
}
