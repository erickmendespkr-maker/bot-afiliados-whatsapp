import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regra compartilhada pelas selecoes de origem/destino no painel.
// Nao importa o socket nem realiza envios.
const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const inicio = painel.indexOf("if (req.method === 'POST' && url === '/painel/origens')");
const fim = painel.indexOf("if (req.method === 'GET' && url === '/painel/simular-oferta')", inicio);
assert.ok(inicio >= 0 && fim > inicio, 'rotas de selecao de grupos encontradas');
const trecho = painel.slice(inicio, fim);
const regra = /\^\[0-9\]\+\(\?:-\[0-9\]\+\)\?@g\\\.us\$/g;

test('origens e destinos aceitam JIDs com componente numerico opcional', () => {
  assert.equal([...trecho.matchAll(regra)].length, 2);
  const valido = /^[0-9]+(?:-[0-9]+)?@g\.us$/;
  assert.equal(valido.test('12345@g.us'), true);
  assert.equal(valido.test('12345-67890@g.us'), true);
  assert.equal(valido.test('12345-@g.us'), false);
  assert.equal(valido.test('12345-abc@g.us'), false);
});
