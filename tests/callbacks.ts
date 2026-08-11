// Canonical runner for ESSTR vectors, shared by the Node harness
// (tests/esstr-test-entry.ts) and the live probe (tests/esstr-live-verify.mjs).
// Strings transport as plain strings through JSON; hex-encoding is applied by
// the live-verify transport layer around this.

export function runVector(vec: any, core: any): any {
  var op = vec.op;
  try {
    switch (op) {
      case 'trim': return { ok: true, result: core.trim(vec.input) };
      case 'trimLeft': return { ok: true, result: core.trimLeft(vec.input) };
      case 'trimRight': return { ok: true, result: core.trimRight(vec.input) };
      case 'trimStart': return { ok: true, result: core.trimStart(vec.input) };
      case 'trimEnd': return { ok: true, result: core.trimEnd(vec.input) };
      default: return { ok: false, result: 'unknown op ' + op };
    }
  } catch (e) {
    return { ok: false, result: 'THREW: ' + String(e) };
  }
}
