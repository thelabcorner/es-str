import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
var DIST = join(ROOT, 'dist');
var manifest = JSON.parse(readFileSync(join(DIST, 'ESSTR.manifest.json'), 'utf8'));
var rootArtifact = readFileSync(join(DIST, 'ESSTR.accel.jsx'), 'utf8');
var esb64Package = JSON.parse(readFileSync(join(ROOT, '..', 'esb64', 'package.json'), 'utf8'));
var escharsPackage = JSON.parse(readFileSync(join(ROOT, '..', 'eschars', 'package.json'), 'utf8'));
var esstrPackage = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

assert.equal(manifest.format, 'espack-manifest');
assert.equal(manifest.version, 2);
assert.equal(manifest.bundleName, 'esstr');
assert.deepEqual(manifest.libraries.map(function (lib) { return lib.id; }), ['esb64', 'eschars', 'esstr'],
  'transitive closure is dependency-first');

var esb64 = manifest.libraries[0];
var eschars = manifest.libraries[1];
var esstr = manifest.libraries[2];
assert.equal(esb64.version, esb64Package.version);
assert.equal(eschars.version, escharsPackage.version);
assert.equal(esstr.version, esstrPackage.version);
assert.deepEqual(eschars.requires, [{ id: 'esb64', range: '^' + esb64Package.version, optional: false }]);
assert.deepEqual(esstr.requires, [{ id: 'eschars', range: '^' + escharsPackage.version, optional: false }]);

for (var i = 0; i < manifest.libraries.length; i++) {
  var lib = manifest.libraries[i];
  var bytes = Buffer.from(lib.artifact.b64, 'base64');
  var sourceRoot = lib.id === 'esb64' ? join(ROOT, '..', 'esb64', 'dist') :
    (lib.id === 'eschars' ? join(ROOT, '..', 'eschars', 'dist') : DIST);
  var sourceBytes = readFileSync(join(sourceRoot, lib.artifact.fileName));
  assert.equal(bytes.length, lib.artifact.len, lib.id + ' UTF-8 byte length');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), lib.artifact.sha256,
    lib.id + ' SHA-256 provenance');
  assert.deepEqual(bytes, sourceBytes, lib.id + ' embedded bytes match source artifact');
}

assert.equal(esstr.activation.global, 'ESSTR');
assert.equal(esstr.activation.type, 'object');
assert.ok(esstr.activation.contract.some(function (row) { return row.name === 'trim' && row.type === 'function'; }));
assert.ok(esstr.activation.contract.some(function (row) { return row.name === 'enableNativeGate' && row.type === 'function'; }));
assert.deepEqual(manifest.capabilities.map(function (cap) { return cap.id; }),
  ['esb64.native', 'eschars.native', 'esstr.native']);
assert.deepEqual(manifest.capabilities[2], {
  id: 'esstr.native', provider: 'esstr', mode: 'optional', payloads: ['ESSTRTrim'], accel: null
});
assert.equal((rootArtifact.match(/var ESPACK = \(function/g) || []).length, 1,
  'root artifact carries exactly one ESPAK control plane');
assert.ok(rootArtifact.includes('ESB64') && rootArtifact.includes('ESCHARS') && rootArtifact.includes('ESSTR'),
  'root artifact contains the full dependency closure');
assert.ok(rootArtifact.includes('ESPAK.load("ESSTRTrim")'), 'ESSTR native payload is addressed by stable name');
assert.ok(!rootArtifact.includes('ESPAK.load(0)'), 'payload access never depends on unstable indexes');

console.log('esstr manifest v2: PASS (dependency order, activation, capabilities, UTF-8 provenance)');