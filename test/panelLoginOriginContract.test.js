import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');

test('login bloqueia Origin externo antes de criar sessao', () => {
  const inicio = painel.indexOf("if (req.method === 'POST' && url === '/painel/login' && req.headers.origin)");
  const login = painel.indexOf("if (req.method === 'POST' && url === '/painel/login') {");
  assert.ok(inicio > 0 && login > inicio, 'validacao de origem deve anteceder o login');
  const trecho = painel.slice(inicio, login);
  assert.match(trecho, /origem\.host === req\.headers\.host/);
  assert.match(trecho, /sendJson\(res, 403/);
  assert.match(trecho, /return true/);
});

test('login nao aceita token na query string', () => {
  const inicio = painel.indexOf("if (req.method === 'POST' && url === '/painel/login') {");
  const fim = painel.indexOf("\n  if (", inicio + 10);
  const trecho = painel.slice(inicio, fim > inicio ? fim : inicio + 1200);
  assert.match(trecho, /autorizado\(req\)/);
  assert.doesNotMatch(trecho, /searchParams\.get\(['"]t['"]\)/);
});
