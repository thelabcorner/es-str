// ESSTR ExtendScript entry — side-effect-only. No exported binding (that
// would force esbuild to emit the module-helper family that legacy
// ExtendScript cannot run). Named imports only (never `import * as`); assemble
// the facade explicitly and assign to $.global['ESSTR']. The ESTC config uses
// a dummy globalName (`__ESSTR_ENTRY__`) so the bundle carries zero module
// helpers.
import {
  trim, trimLeft, trimRight, trimStart, trimEnd, clearMemo, benchmark,
  capabilities, install, enableNativeGate, disableNativeGate, nativeGateStatus,
  enableEschars, disableEschars, escharsStatus
} from './index';

function makeFacade(): any {
  return {
    trim: trim,
    trimLeft: trimLeft,
    trimRight: trimRight,
    trimStart: trimStart,
    trimEnd: trimEnd,
    clearMemo: clearMemo,
    capabilities: capabilities,
    install: install,
    benchmark: benchmark,
    enableNativeGate: enableNativeGate,
    disableNativeGate: disableNativeGate,
    nativeGateStatus: nativeGateStatus,
    enableEschars: enableEschars,
    disableEschars: disableEschars,
    escharsStatus: escharsStatus
  };
}

var __esstrGlobal: any = null;
try { if (typeof $ !== 'undefined' && $.global) { __esstrGlobal = $.global; } } catch (e) { /* ignore */ }
if (!__esstrGlobal) {
  try { __esstrGlobal = (Function as any)('return this')(); } catch (e2) { /* ignore */ }
}
if (__esstrGlobal) {
  __esstrGlobal['ESSTR'] = makeFacade();
}
