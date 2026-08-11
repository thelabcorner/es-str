#target illustrator
(function () {
  var here = File($.fileName).parent.fsName;
  ExternalObject.searchFolders = here + "/bin;" + ExternalObject.searchFolders;
  var lib = new ExternalObject("lib:ESSTRTrim");
  try {
    if (Number(lib.ping(0)) !== 42) throw new Error("ping failed");
    if (String(lib.trim(" \t\r\nabc\uFEFF")) !== "abc") throw new Error("trim ascii/FEFF failed");
    if (String(lib.trim("\u180Ex\u180E")) !== "\u180Ex\u180E") throw new Error("U+180E was trimmed");
    if (String(lib.trimLeft("\u3000abc")) !== "abc") throw new Error("trimLeft U+3000 failed");
    if (String(lib.trimRight("abc\u2029")) !== "abc") throw new Error("trimRight U+2029 failed");
    return "ESSTRTrim probe OK: " + lib.version("");
  } finally {
    try { lib.unload(); } catch (ignore) {}
  }
}());
