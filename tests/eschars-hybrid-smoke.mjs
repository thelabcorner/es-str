#!/usr/bin/env node
// Live smoke for the ESSTR -> ESCHARS native trim fallback.
// Exercises the real merged ESSTR.accel.jsx bundle.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var PROJECT = join(ROOT, '..');
var ACCEL = join(PROJECT, 'dist', 'ESSTR.accel.jsx');
var TOOL = 'C:/Program Files/Adobe/Adobe Illustrator 2026/Presets/en_US/Scripts/agent-skills/illustrator-com-automation-skill/comtool/ILLUSTRATOR_COM_TOOL.py';

if (!existsSync(ACCEL)) { console.error('hybrid-smoke: build first (npm run build:accel)'); process.exit(1); }
if (!existsSync(TOOL)) { console.error('hybrid-smoke: COM tool missing: ' + TOOL); process.exit(1); }

var probeDir = join(process.env.TEMP || '', 'esstr-hybrid-smoke');
mkdirSync(probeDir, { recursive: true });
var probePath = join(probeDir, 'esstr-hybrid-smoke.jsx');
var accelPath = ACCEL.replace(/\\/g, '/');

var src = [
  '#target illustrator',
  '$.evalFile(File("' + accelPath + '"));',
  'var out = { ok: true, engine: $.version, checks: [], calls: 0, leftCalls: 0, rightCalls: 0, status: null, finalStatus: null };',
  'function check(name, cond, detail) { out.checks[out.checks.length] = { name: name, ok: !!cond, detail: detail || "" }; if (!cond) out.ok = false; }',
  'check("merged ESSTR native enabled", ESSTR.espack && ESSTR.espack.ok === true, "reason=" + (ESSTR.espack && ESSTR.espack.reason));',
  'check("merged ESCHARS loaded", ESSTR.eschars && ESSTR.eschars.loaded === true, "reason=" + (ESSTR.eschars && ESSTR.eschars.reason));',
  'var real = $.global.ESCHARS;',
  'check("real trimModern present", real && typeof real.trimModern === "function", "type=" + typeof (real && real.trimModern));',
  'var rt = real.trimModern;',
  'var rl = real.trimModernLeft;',
  'var rr = real.trimModernRight;',
  'real.trimModern = function (s) { if (s !== " x ") out.calls++; return rt(s); };',
  'real.trimModernLeft = function (s) { if (s !== " x ") { out.calls++; out.leftCalls++; } return rl(s); };',
  'real.trimModernRight = function (s) { if (s !== " x ") { out.calls++; out.rightCalls++; } return rr(s); };',
  'ESSTR.disableNativeGate();',
  'ESSTR.enableEschars();',
  'out.status = ESSTR.escharsStatus();',
  'check("trim surface not tried before first trim", out.status && out.status.trimTried === false, "trimTried=" + (out.status && out.status.trimTried));',
  'var longPad = Array(600).join(" ") + "abc" + Array(10).join(" ");',
  'var longLeft = Array(600).join(" ") + "abc   ";',
  'var longRight = "   abc" + Array(600).join(" ");',
  'var longClean = Array(2000).join("a");',
  'var exotic = "\uFEFF\u1680\u3000" + Array(300).join(" ") + "abc" + "\u3000\uFEFF";',
  'var keep180e = "\u180E" + Array(300).join(" ") + "abc" + "\u180E";',
  'var shortPad = "  abc  ";',
  'var nul = Array(300).join(" ") + "AB" + String.fromCharCode(0) + "  ";',
  'var surrogate = Array(300).join(" ") + String.fromCharCode(0xD800) + "abc  ";',
  'var before = out.calls;',
  'check("long padded result", ESSTR.trim(longPad) === "abc", "calls=" + out.calls);',
  'check("long padded used ESCHARS", out.calls === before + 1, "calls=" + out.calls + " before=" + before);',
  'before = out.leftCalls;',
  'check("long trimLeft result", ESSTR.trimLeft(longLeft) === "abc   ", "leftCalls=" + out.leftCalls);',
  'check("long trimLeft used ESCHARS", out.leftCalls === before + 1, "leftCalls=" + out.leftCalls + " before=" + before);',
  'before = out.rightCalls;',
  'check("long trimRight result", ESSTR.trimRight(longRight) === "   abc", "rightCalls=" + out.rightCalls);',
  'check("long trimRight used ESCHARS", out.rightCalls === before + 1, "rightCalls=" + out.rightCalls + " before=" + before);',
  'before = out.calls;',
  'check("exotic whitespace result", ESSTR.trim(exotic) === "abc", "calls=" + out.calls);',
  'check("exotic whitespace used ESCHARS", out.calls === before + 1, "calls=" + out.calls + " before=" + before);',
  'before = out.calls;',
  'check("U+180E kept", ESSTR.trim(keep180e).charCodeAt(0) === 0x180E, "code=" + ESSTR.trim(keep180e).charCodeAt(0));',
  'check("U+180E skipped ESCHARS", out.calls === before, "calls=" + out.calls + " before=" + before);',
  'before = out.calls;',
  'check("long clean result", ESSTR.trim(longClean) === longClean, "len=" + ESSTR.trim(longClean).length);',
  'check("long clean skipped ESCHARS", out.calls === before, "calls=" + out.calls + " before=" + before);',
  'before = out.calls;',
  'check("short padded result", ESSTR.trim(shortPad) === "abc", "calls=" + out.calls);',
  'check("short padded skipped ESCHARS", out.calls === before, "calls=" + out.calls + " before=" + before);',
  'before = out.calls;',
  'check("nul fallback keeps nul", ESSTR.trim(nul) === "AB" + String.fromCharCode(0), "len=" + ESSTR.trim(nul).length);',
  'check("nul skipped ESCHARS", out.calls === before, "calls=" + out.calls + " before=" + before);',
  'before = out.calls;',
  'check("surrogate fallback keeps surrogate", ESSTR.trim(surrogate).charCodeAt(0) === 0xD800, "code=" + ESSTR.trim(surrogate).charCodeAt(0));',
  'check("surrogate skipped ESCHARS", out.calls === before, "calls=" + out.calls + " before=" + before);',
  'out.finalStatus = ESSTR.escharsStatus();',
  'check("trim surface loaded lazily", out.finalStatus && out.finalStatus.trimLoaded === true, "reason=" + (out.finalStatus && out.finalStatus.trimReason));',
  'out;',
  ''
].join('\n');
writeFileSync(probePath, src, 'utf8');

var pyOut = execFileSync('python', [TOOL, 'eval', '--file', probePath.replace(/\\/g, '/'), '--launch'], { encoding: 'utf8', timeout: 300000 });
var env = JSON.parse(pyOut.trim());
if (!env.ok) { console.error('hybrid-smoke: COM error: ' + JSON.stringify(env).slice(0, 1500)); process.exit(1); }
var report = env.result && env.result.result ? env.result.result : env.result;
var bad = (report.checks || []).filter(function (c) { return !c.ok; });
console.log('hybrid-smoke: engine ' + report.engine + ', calls=' + report.calls + ', trimLoaded=' + (report.finalStatus && report.finalStatus.trimLoaded));
for (var i = 0; i < report.checks.length; i++) {
  var c = report.checks[i];
  console.log('  ' + (c.ok ? 'ok  ' : 'FAIL') + ' ' + c.name + (c.detail ? ' — ' + c.detail : ''));
}
if (bad.length > 0) { process.exit(1); }
