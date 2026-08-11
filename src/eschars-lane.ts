// ESSTR ESCHARS lane — optional sibling facade resolver.
//
// This mirrors ESHTTP's vendored-sibling pattern: the full ESSTR build embeds
// ESCHARS.accel.min.jsx as ESCHARS_ACCEL_BUNDLE, then this module lazy-evals it
// once on first useful trim. The tiny runtime build does not embed the payload;
// if a host already has $.global.ESCHARS, this lane can still use it.
//
// ESSTRTrim.dll remains the trim acceleration path. ESCHARS is merged into the
// accelerated release bundle so consumers have one flat ESPACK payload set and
// so a future ESChars.dll trim surface can be adopted without nested bundles.
// The current ESCHARS packBytes lane is intentionally NOT used for trim: it is
// byte-oriented and loses to ESSTRTrim.dll for long strings and ESSTR's memoized
// ES3 scanner for short strings.

var escharsFacade: any = null;
var escharsTried = false;
var escharsDisabled = false;
var escharsReason = 'not tried';

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
  return { tried: escharsTried, loaded: !!escharsFacade, disabled: escharsDisabled, reason: escharsReason };
}

export function disableEschars(): void {
  escharsDisabled = true;
  escharsFacade = null;
  escharsReason = 'disabled';
}

export function enableEschars(): any {
  escharsDisabled = false;
  escharsTried = false;
  escharsFacade = null;
  escharsReason = 'not tried';
  return resolveEschars();
}
