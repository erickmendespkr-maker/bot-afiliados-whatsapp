import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('o ponto de entrada inicia o servidor original', () => {
  const entry = source('index.js');
  assert.match(entry, /from ['"]\.\/src\/localServer\.js['"]/);
  assert.match(entry, /startLocalServer\(\)/);
});

test('o servidor utiliza o painel real e preserva o envio existente', () => {
  const server = source('src/localServer.js');
  assert.match(server, /from ['"]\.\/painel\.js['"]/);
  assert.match(server, /tratarRotaDoPainel\(req, res/);
  assert.match(server, /sendDealToGroups\(/);
  assert.doesNotMatch(server, /render-preview\.js/);
});

test('publicacao da extensao exige autorizacao, destinos confirmados e pausa desativada', () => {
  const server = source('src/localServer.js');
  assert.match(server, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(server, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(server, /estaPausado\(\)/);
  assert.match(server, /await waitForConnection\(\)/);
  const beforeSend = server.slice(server.indexOf('await waitForConnection()'), server.indexOf('const ok = await sendDealToGroups'));
  assert.match(beforeSend, /estaPausado\(\)/);
  assert.match(beforeSend, /GRUPOS_DESTINO_CONFIRMADOS/);
});

test('o painel protege sessoes e oferece simulacao sem envio', () => {
  const painel = source('src/painel.js');
  assert.match(painel, /HttpOnly/);
  assert.match(painel, /cookiePermitido/);
  assert.match(painel, /origemSegura/);
  assert.match(painel, /\/painel\/simular-oferta/);
  assert.match(painel, /simulacao: true, enviado: false/);
});
