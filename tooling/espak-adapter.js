// ESSTR ESPAK adapter (appended to dist/ESSTR.facade.jsx and
// dist/ESSTR.accel.jsx). Requires ESPAK on $.global (or in script scope) and
// the ESSTR facade already evaluated. Publishes ESSTR.espack / ESSTR.eschars
// and re-exports both globals so a merged composite has one shared loader.
(function () {
  if (typeof ESPAK !== "object" || !ESPAK || typeof ESPAK.load !== "function") return;
  if (typeof ESSTR !== "object" || !ESSTR || typeof ESSTR.enableNativeGate !== "function") return;
  var cached = null;
  function useEspack() {
    var l = ESPAK.load("ESSTRTrim");
    if (!l.ok || l.mode !== "native" || !l.lib) {
      cached = { ok: false, reason: (l && l.error) || "ESPAK load failed" };
      return cached;
    }
    var caps = ESSTR.enableNativeGate({ lib: l.lib, dllPath: l.path });
    cached = { ok: caps.enabled === true, caps: caps, path: l.path };
    return cached;
  }
  ESSTR.useEspack = useEspack;
  ESSTR.espack = useEspack();
  if (typeof ESSTR.enableEschars === "function") {
    try { ESSTR.enableEschars(); ESSTR.eschars = ESSTR.escharsStatus(); } catch (e3) { ESSTR.eschars = { loaded: false, reason: String(e3) }; }
  }
  var g = null;
  try { if (typeof $ !== "undefined" && $.global) { g = $.global; } } catch (e1) {}
  if (g) {
    g.ESSTR = ESSTR;
    g.ESPAK = ESPAK;
  }
}());
