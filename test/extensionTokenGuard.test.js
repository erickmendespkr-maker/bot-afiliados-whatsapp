import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regressao: /post nunca pode herdar a dispensa de token do painel em loopback.
test('publicacao pela extensao exige token explicito inclusive em localhost', () => {
  const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
  const route = source.match(/if \(req\.method === 'POST' && pathname === '\/post'\) \{([\s\S]*?)\/\/ A extensao e clientes locais/);
  assert.ok(route, 'rota /post nao encontrada');
  assert.match(route[1], /!config\.painel\.token/);
  assert.match(route[1], /req\.headers\['x-painel-token'\] !== config\.painel\.token/);
  assert.match(route[1], /!autorizado\(req\)/);
});
