import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Testes de regressao sem WhatsApp, rede, credenciais ou publicacao.
const ler = (arquivo) => readFileSync(new URL('../' + arquivo, import.meta.url), 'utf8');

test('rota /post rejeita JSON null, array e primitivos antes de desestruturar', () => {
  const codigo = ler('src/localServer.js');
  const inicio = codigo.indexOf('async function handlePost(');
  const validacao = codigo.indexOf("Array.isArray(payload)", inicio);
  const desestruturacao = codigo.indexOf('const { source, productUrl', inicio);
  assert.ok(inicio >= 0 && validacao > inicio && desestruturacao > validacao);
  assert.match(codigo.slice(inicio, desestruturacao), /!payload\s*\|\|\s*typeof payload !== 'object'/);
  assert.match(codigo.slice(validacao, desestruturacao), /sendJson\(res, 400,/);
});

test('rota /post bloqueia envios sem autorizacao e destinos confirmados', () => {
  const codigo = ler('src/localServer.js');
  const inicio = codigo.indexOf('async function handlePost(');
  const envio = codigo.indexOf('await sendDealToGroups(', inicio);
  assert.ok(inicio >= 0 && envio > inicio);
  const trecho = codigo.slice(inicio, envio);
  assert.match(trecho, /config\.dryRun/);
  assert.match(trecho, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(trecho, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(trecho, /estaPausado\(\)/);
  assert.match(trecho, /destinosConfirmadosAgora/);
});

test('painel real e servido por localServer sem depender de render-preview', () => {
  const codigo = ler('src/localServer.js');
  assert.match(codigo, /tratarRotaDoPainel\(req, res, sendJson, readJsonBody\)/);
  assert.doesNotMatch(codigo, /render-preview\.js/);
});


test('servidor captura rejeicoes inesperadas do handler async /post', () => {
  const codigo = ler('src/localServer.js');
  assert.match(codigo, /void handlePost\(req, res\)\.catch\(\(err\) =>/);
  assert.match(codigo, /if \(!res\.headersSent && !res\.destroyed\)/);
  assert.match(codigo, /else if \(!res\.writableEnded\)/);
});
