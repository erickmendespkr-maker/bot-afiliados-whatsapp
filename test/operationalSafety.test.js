import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { estaPausado, definirPausa } from '../src/operationControl.js';
import { getLatestQr, setLatestQr } from '../src/whatsapp/webQr.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test('motor inicia pausado em processo novo e nao habilita envio implicitamente', () => {
  const code = "import { estaPausado } from './src/operationControl.js'; if (!estaPausado()) process.exit(1)";
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('controle aceita apenas booleanos e preserva o estado apos erro', () => {
  definirPausa(true);
  for (const value of ['false', 0, null, undefined, {}]) {
    assert.throws(() => definirPausa(value), TypeError);
    assert.equal(estaPausado(), true);
  }
  assert.equal(definirPausa(false), false);
  assert.equal(estaPausado(), false);
  assert.equal(definirPausa(true), true);
});

test('QR fica somente em memoria e pode ser revogado', () => {
  setLatestQr('qr-de-teste');
  assert.equal(getLatestQr(), 'qr-de-teste');
  setLatestQr(null);
  assert.equal(getLatestQr(), null);
});

test('QR expira depois de 60 segundos', () => {
  const original = Date.now;
  let now = 1000000;
  try {
    Date.now = () => now;
    setLatestQr('qr-temporario');
    now += 60001;
    assert.equal(getLatestQr(), null);
  } finally {
    Date.now = original;
    setLatestQr(null);
  }
});
