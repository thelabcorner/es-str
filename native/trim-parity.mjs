#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const exe = join(process.cwd(), 'native', 'bin', 'ESSTRTrimTest.exe');
const dll = join(process.cwd(), 'native', 'bin', 'ESSTRTrim.dll');

if (!existsSync(dll) || !existsSync(exe)) {
  console.log('[trim-parity] PENDING: native/bin/ESSTRTrim.dll or ESSTRTrimTest.exe missing (run npm run native-build)');
  process.exit(0);
}

const r = spawnSync(exe, [], { cwd: process.cwd(), encoding: 'utf8' });
if (r.status !== 0) {
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  console.error('[trim-parity] FAIL: ESSTRTrimTest.exe exited ' + r.status);
  process.exit(r.status || 1);
}
console.log('[trim-parity] OK: ESSTRTrim local ABI vectors passed');
