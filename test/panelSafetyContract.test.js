import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard for the original engine's two HTTP entry points.
// Static contract only: integration tests still require dependencies and a live server.
const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');

test('panel routes are authenticated before private QR, groups and writes', () => {
  const auth = painel.indexOf("if (url.startsWith('/painel') && !autorizado(req))");
  assert.ok(auth >= 0, 'Panel authentication gate missing');
  for (const route of ['/painel/qr', '/painel/grupos', '/painel/afiliados', '/painel/operacao']) {
    const at = painel.indexOf("url === '" + route + "'");
    assert.ok(at > auth, route + ' must remain behind the authentication gate');
  }
  assert.match(painel, /timingSafeEqual\(recebido, segredo\)/);
  assert.match(painel, /Cache-Control', 'no-store, private'/);
});

test('extension sending remains opt-in, group-confirmed and pause-aware', () => {
  const gate = server.indexOf("process.env.AUTORIZAR_ENVIO_EXTENSAO !== 'sim'");
  const confirm = server.indexOf("process.env.GRUPOS_DESTINO_CONFIRMADOS");
  const pause = server.indexOf('if (estaPausado())');
  const send = server.indexOf('await sendDealToGroups(');
  assert.ok(gate >= 0 && confirm >= 0 && pause >= 0 && send > gate,
    'Sending must remain gated by explicit consent, confirmed destinations and pause');
  assert.ok(pause < send, 'Pause must be checked before sending');
});
