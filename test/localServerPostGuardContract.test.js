import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Contract tests for the real /post handler. These run without WhatsApp credentials,
// without starting a server, and without sending messages.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('async function handlePost('), source.indexOf('\n// Descobre o IP', source.indexOf('async function handlePost(')));

test('/post rejects JSON primitives and arrays before destructuring', () => {
  assert.match(handler, /!payload\s*\|\|\s*typeof payload !== 'object'\s*\|\|\s*Array\.isArray\(payload\)/);
  assert.match(handler, /sendJson\(res, 400, \{ ok: false, error: 'O corpo deve ser um objeto JSON\.'/);
});

test('/post requires explicit send authorization and confirmed destinations', () => {
  assert.match(handler, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(handler, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(handler, /config\.dryRun/);
  assert.match(handler, /confirmados\.length === 0/);
  assert.match(handler, /every\(\(jid\) => confirmados\.includes\(jid\)\)/);
});

test('/post rechecks pause and destinations after waiting for WhatsApp', () => {
  const wait = handler.indexOf('await waitForConnection()');
  assert.ok(wait >= 0);
  const afterWait = handler.slice(wait);
  assert.match(afterWait, /estaPausado\(\)/);
  assert.match(afterWait, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(afterWait, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.ok(afterWait.indexOf('sendDealToGroups(') > afterWait.indexOf('GRUPOS_DESTINO_CONFIRMADOS'));
});

test('/post does not return internal provider errors to HTTP clients', () => {
  assert.match(handler, /describeError\(err\)/);
  assert.match(handler, /Falha interna ao processar a oferta\. Consulte o log do servidor\./);
});
