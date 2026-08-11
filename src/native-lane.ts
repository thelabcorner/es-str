// ESSTR native lane — optional ExternalObject accelerator dispatch.
//
// The pure TypeScript implementation is the semantic authority. This lane is
// enabled explicitly (ESSTR.enableNativeGate({ lib })) or by the ESPACK bundle;
// failures fall back to the pure scanner. Keep this file ES3-safe after bundle.

export interface NativeGateOptions {
  lib?: any;
  dllPath?: string;
  minLength?: number;
}

export interface NativeGateReport {
  present: boolean;
  enabled: boolean;
  reason: string;
  version: string;
  dllPath: string;
  minLength: number;
}

var nativeLib: any = null;
var nativeDllPath = '';
// Default threshold: the existing memoized JS lane wins for short/repeated
// strings. The DLL is for long edge scans and explicit accelerated bundles.
var nativeMinLength = 257;

function okMethod(lib: any, name: string): boolean {
  try { return !!lib && typeof lib[name] === 'function'; } catch (e) { return false; }
}

function hasUnsafeNativeStringUnits(s: string): boolean {
  var i = 0;
  var c = 0;
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    if (c === 0 || (c >= 0xD800 && c <= 0xDFFF)) {
      return true;
    }
  }
  return false;
}

function report(enabled: boolean, reason: string, version: string): NativeGateReport {
  return {
    present: typeof ExternalObject !== 'undefined',
    enabled: enabled,
    reason: reason,
    version: version || '',
    dllPath: nativeDllPath,
    minLength: nativeMinLength
  };
}

export function enableNativeGate(options?: NativeGateOptions): NativeGateReport {
  var opts = options || {};
  var lib = opts.lib;
  var version = '';
  nativeDllPath = opts.dllPath || nativeDllPath || '';
  if (typeof opts.minLength === 'number' && opts.minLength >= 0) {
    nativeMinLength = opts.minLength;
  }
  if (!lib) {
    return report(false, 'no lib supplied', '');
  }
  if (!okMethod(lib, 'trim') || !okMethod(lib, 'trimLeft') || !okMethod(lib, 'trimRight')) {
    nativeLib = null;
    return report(false, 'required ESSTRString bindings missing', '');
  }
  try {
    if (okMethod(lib, 'version')) {
      version = String(lib.version(''));
    }
    if (okMethod(lib, 'ping') && Number(lib.ping(0)) !== 42) {
      nativeLib = null;
      return report(false, 'ping failed', version);
    }
  } catch (e) {
    nativeLib = null;
    return report(false, 'smoke failed', version);
  }
  nativeLib = lib;
  return report(true, 'enabled', version);
}

export function disableNativeGate(): NativeGateReport {
  nativeLib = null;
  return report(false, 'disabled', '');
}

export function nativeGateStatus(): NativeGateReport {
  return report(!!nativeLib, nativeLib ? 'enabled' : 'disabled', '');
}

export function nativeTrim(s: string, mode: number): string | void {
  var lib = nativeLib;
  if (!lib || s.length < nativeMinLength) { return void 0; }
  if (hasUnsafeNativeStringUnits(s)) { return void 0; }
  try {
    if (mode === 1) { return String(lib.trimLeft(s)); }
    if (mode === 2) { return String(lib.trimRight(s)); }
    return String(lib.trim(s));
  } catch (e) {
    return void 0;
  }
}
