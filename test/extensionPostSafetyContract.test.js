import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');

test('extension post is authenticated before parsing or sending', () => {
  const route = server.slice(server.indexOf("req.method === 'POST' && new URL(req.url"));
  assert.match(route, /if \(!autorizado\(req\)\)/);
  assert.match(route, /sendJson\(res, 401/);
  assert.match(route, /void handlePost\(req, res\)\.catch/);
});

test('browser cross-origin post is rejected, without enabling wildcard CORS', () => {
  assert.match(server, /if \(req\.headers\.origin\)/);
  assert.match(server, /origem\.host === req\.headers\.host/);
  assert.match(server, /Origem nao autorizada/);
  assert.doesNotMatch(server, /Access-Control-Allow-Origin['"],\s*['"]\*/);
});

test('post refuses malformed body, paused operation, and unconfirmed destinations', () => {
  assert.match(server, /Array\.isArray\(payload\)/);
  assert.match(server, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(server, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(server, /if \(estaPausado\(\)\)/);
  assert.match(server, /Revalidar imediatamente antes de delegar/);
});
