import assert from 'node:assert/strict';
import { disableNativeGate, enableNativeGate } from '../dist/esstr-core.esm.mjs';

var unloads = 0;
var borrowed = {
  trim: function (value) { return value; },
  trimLeft: function (value) { return value; },
  trimRight: function (value) { return value; },
  version: function () { return '1'; },
  ping: function () { return 42; },
  unload: function () { unloads++; }
};

var enabled = enableNativeGate({ lib: borrowed, dllPath: 'borrowed://ESSTRTrim', minLength: 0 });
assert.equal(enabled.enabled, true, 'borrowed native gate enables');
disableNativeGate();
assert.equal(unloads, 0, 'ESSTR never unloads the ESPACK-owned ExternalObject');

console.log('esstr ownership: PASS');