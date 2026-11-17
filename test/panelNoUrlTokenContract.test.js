import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');

test('painel nao aceita token em query string', () => {
  assert.doesNotMatch(painel, /searchParams\.get\(['"]t['"]\)/);
  assert.match(painel, /req\.headers\['x-painel-token'\]/);
});

test('redirecionamento raiz nao replica query string', () => {
  assert.match(painel, /Location: '\/painel'/);
  assert.doesNotMatch(painel, /\$\{queryString\}/);
});

test('login continua por cabecalho e cookie HttpOnly', () => {
  assert.match(painel, /fetch\('\/painel\/login'/);
  assert.match(painel, /HttpOnly; SameSite=Strict/);
});
