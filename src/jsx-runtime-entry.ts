// ESSTR runtime ExtendScript entry — side-effect-only, the five trim methods
// only for per-eval injection (capabilities/install/benchmark/gate pruned).
// Mirrors src/jsx-entry.ts: named imports only, explicit facade, assigned to
// $.global['ESSTR']. ESTC config uses a dummy globalName (`__ESSTR_RUNTIME_ENTRY__`).
import { trim, trimLeft, trimRight, trimStart, trimEnd, clearMemo } from './index';

function makeRuntimeFacade(): any {
  return {
    trim: trim,
    trimLeft: trimLeft,
    trimRight: trimRight,
    trimStart: trimStart,
    trimEnd: trimEnd,
    clearMemo: clearMemo
  };
}

var __esstrRuntimeGlobal: any = null;
try { if (typeof $ !== 'undefined' && $.global) { __esstrRuntimeGlobal = $.global; } } catch (e) { /* ignore */ }
if (!__esstrRuntimeGlobal) {
  try { __esstrRuntimeGlobal = (Function as any)('return this')(); } catch (e2) { /* ignore */ }
}
if (__esstrRuntimeGlobal) {
  __esstrRuntimeGlobal['ESSTR'] = makeRuntimeFacade();
}
