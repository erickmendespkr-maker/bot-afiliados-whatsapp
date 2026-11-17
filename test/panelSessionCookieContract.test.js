import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');

test('painel usa cookie HttpOnly sem ler token mestre do localStorage', () => {
  assert.match(source, /HttpOnly; SameSite=Strict/);
  assert.doesNotMatch(source, /localStorage\.getItem\(['"]painelToken['"]\)/);
  assert.match(source, /const TOKEN = '';/);
});

test('sessao de cookie exige Origin valido para escrita', () => {
  assert.match(source, /const cookiePermitido = req\.method === 'GET' \|\|/);
  assert.match(source, /req\.method === 'POST' && origemSegura/);
  assert.match(source, /origem\.host === req\.headers\.host/);
});

test('rotas autenticadas continuam exigindo autorizacao', () => {
  assert.match(source, /url\.startsWith\('\/painel'\) && !autorizado\(req\)/);
});
