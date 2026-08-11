#target illustrator
(function () {
  var root = File($.fileName).parent.parent;
  var bundle = File(root.fsName + "/dist/ESSTR.accel.jsx");
  if (!bundle.exists) throw new Error("missing bundle: " + bundle.fsName);
  $.evalFile(bundle);
  if (typeof ESSTR !== "object" || !ESSTR) throw new Error("ESSTR missing after accel eval");
  if (!ESSTR.espack || ESSTR.espack.ok !== true) {
    throw new Error("ESSTR.espack not enabled: " + (ESSTR.espack && ESSTR.espack.reason));
  }
  var s = "";
  var i = 0;
  for (i = 0; i < 300; i++) s += "x";
  var got = ESSTR.trim("\uFEFF  " + s + "  \u2029");
  if (got !== s) throw new Error("accelerated long trim mismatch len=" + got.length);
  var kept = ESSTR.trim("\u180E" + s + "\u180E");
  if (kept !== "\u180E" + s + "\u180E") throw new Error("U+180E was trimmed");
  var st = ESSTR.nativeGateStatus();
  return "ESSTR.accel live smoke OK enabled=" + st.enabled + " len=" + got.length;
}());
