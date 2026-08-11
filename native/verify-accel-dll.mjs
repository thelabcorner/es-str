#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const dll = process.argv[2] || join(ROOT, 'native', 'bin', 'ESSTRTrim.dll');
const required = ['ESInitialize', 'ESGetVersion', 'ESFreeMem', 'ESTerminate', 'trim', 'trimLeft', 'trimRight', 'ping', 'version'];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function fail(message) {
  console.error('[verify-accel-dll] FAIL: ' + message);
  process.exit(1);
}

if (!existsSync(dll)) {
  fail('missing: ' + dll);
}
if (statSync(dll).size <= 0) {
  fail('empty DLL: ' + dll);
}

const bytes = readFileSync(dll);

function verifyPeHeader(buf) {
  if (buf.length < 0x100) fail('too small to be a PE image');
  if (buf[0] !== 0x4D || buf[1] !== 0x5A) fail('missing MZ header');
  const pe = buf.readUInt32LE(0x3C);
  if (pe + 0x5E >= buf.length) fail('invalid PE header offset');
  if (buf.toString('ascii', pe, pe + 4) !== 'PE\0\0') fail('missing PE signature');
  const machine = buf.readUInt16LE(pe + 4);
  if (machine !== 0x8664) fail('not AMD64/x64 machine: 0x' + machine.toString(16));
  const timestamp = buf.readUInt32LE(pe + 8);
  if (timestamp !== 0) fail('PE timestamp is not deterministic (/timestamp:0 expected): ' + timestamp);
  const characteristics = buf.readUInt16LE(pe + 22);
  if ((characteristics & 0x2000) === 0) fail('PE characteristics do not mark a DLL');
  const opt = pe + 24;
  const magic = buf.readUInt16LE(opt);
  if (magic !== 0x20B) fail('not a PE32+ image: 0x' + magic.toString(16));
  const dllChars = buf.readUInt16LE(opt + 0x46);
  if ((dllChars & 0x0040) === 0) fail('ASLR/DYNAMIC_BASE flag missing');
  if ((dllChars & 0x0100) === 0) fail('NX_COMPAT flag missing');
}

function verifyStrings(buf) {
  const latin = buf.toString('latin1');
  for (const name of required) {
    if (!latin.includes(name)) fail('missing export string: ' + name);
  }
  if (!latin.includes('KERNEL32.dll')) fail('KERNEL32.dll import not found');
  const forbidden = ['VCRUNTIME', 'MSVCRT', 'ucrtbase'];
  for (const name of forbidden) {
    if (latin.toUpperCase().includes(name.toUpperCase())) fail('unexpected CRT import marker: ' + name);
  }
}

function verifyExternalTool() {
  const dump = spawnSync('dumpbin', ['/headers', '/exports', dll], { encoding: 'utf8' });
  if (dump.status === 0) return 'dumpbin';
  const candidates = [
    process.env.LLVM_READOBJ,
    process.env.CLANG_PATH ? join(dirname(process.env.CLANG_PATH), 'llvm-readobj.exe') : '',
    process.env.LLD_PATH ? join(dirname(process.env.LLD_PATH), 'llvm-readobj.exe') : '',
    'C:\\dev\\emsdk\\upstream\\bin\\llvm-readobj.exe',
    'llvm-readobj'
  ].filter(Boolean);
  for (const tool of candidates) {
    const r = spawnSync(tool, ['--file-headers', '--coff-exports', '--needed-libs', dll], { encoding: 'utf8' });
    if (r.status === 0) return tool;
  }
  return 'internal-pe-parser';
}

function verifyManifestPayload(buf) {
  const manifestPath = join(ROOT, 'dist', 'ESSTR.manifest.json');
  if (!existsSync(manifestPath)) return 'no manifest';
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const payloads = manifest && Array.isArray(manifest.payloads) ? manifest.payloads : [];
  const payload = payloads.find((p) => p && p.name === 'ESSTRTrim');
  if (!payload) fail('dist/ESSTR.manifest.json has no ESSTRTrim payload');
  const embedded = Buffer.from(String(payload.b64), 'base64');
  if (embedded.length !== buf.length || !embedded.equals(buf)) {
    fail('manifest ESSTRTrim payload does not match native/bin/ESSTRTrim.dll');
  }
  return 'manifest payload byte-identical';
}

verifyPeHeader(bytes);
verifyStrings(bytes);
const tool = verifyExternalTool();
const manifest = verifyManifestPayload(bytes);
console.log('[verify-accel-dll] OK: ' + dll + ' (' + bytes.length + ' bytes, sha256 ' + sha256(bytes) + ', ' + tool + ', ' + manifest + ')');
