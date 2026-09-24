// ESSTR vendor gap-fill footer.
//
// This is the documented polyfill contract of dist/vendor-esstr.js and
// dist/vendor-esstr-runtime.js: the five String.prototype methods are
// installed ONLY when absent (true polyfill semantics). ESSTR.install() is
// the idempotent facade entry point; install({ forceReplace: true }) is the
// explicit override used by the live probes. This mutation is intentional and
// artifact-scoped: the ESTC static gate sees an alias-rooted assignment
// (p.trim = ...), not a CORE_GLOBAL_PATCH, and the JSX entry points stay
// bundle-local. Do not widen this to a generic global shim.
(function () {
  var g = null;
  try { if (typeof $ !== "undefined" && $.global) { g = $.global; } } catch (e1) {}
  if (!g) { try { g = (function () { return this; })(); } catch (e2) {} }
  if (!g || !g.String || !g.String.prototype) return;
  var p = g.String.prototype;
  if (typeof p.trim !== "function") { p.trim = function () { return ESSTR.trim(this); }; }
  if (typeof p.trimLeft !== "function") { p.trimLeft = function () { return ESSTR.trimLeft(this); }; }
  if (typeof p.trimRight !== "function") { p.trimRight = function () { return ESSTR.trimRight(this); }; }
  if (typeof p.trimStart !== "function") { p.trimStart = function () { return ESSTR.trimStart(this); }; }
  if (typeof p.trimEnd !== "function") { p.trimEnd = function () { return ESSTR.trimEnd(this); }; }
})();
