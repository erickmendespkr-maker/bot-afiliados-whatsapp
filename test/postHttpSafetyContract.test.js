import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');

test('rota /post rejeita JSON nao objeto e tipos inesperados antes dos conversores', () => {
  assert.match(server, /!payload\s*\|\|\s*typeof payload !== 'object'\s*\|\|\s*Array\.isArray\(payload\)/);
  assert.match(server, /camposTexto\.every\(\(valor\) => typeof valor === 'string'/);
});

test('rota /post rejeita esquemas perigosos e credenciais em URLs', () => {
  assert.match(server, /\['http:', 'https:'\]\.includes\(urlProduto\.protocol\)/);
  assert.match(server, /urlProduto\.username\s*\|\|\s*urlProduto\.password/);
  assert.match(server, /\['http:', 'https:'\]\.includes\(urlImagem\.protocol\)/);
});

test('rota /post revalida pausa e autorizacao apos aguardar WhatsApp', () => {
  const espera = server.indexOf('await waitForConnection(30000)');
  assert.ok(espera >= 0);
  const posterior = server.slice(espera);
  assert.match(posterior, /estaPausado\(\)/);
  assert.match(posterior, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(posterior, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.ok(posterior.indexOf('AUTORIZAR_ENVIO_EXTENSAO') < posterior.indexOf('await sendDealToGroups('));
});
