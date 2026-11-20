import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regressao estrutural: os tres pontos que validam Origin precisam aplicar
// os mesmos filtros antes de aceitar login, cookie ou escrita autenticada.
const fonte = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
for (const [nome, inicio, fim] of [
  ['sessao cookie', 'function autorizado(req)', 'export function tratarRotaDoPainel'],
  ['login', "if (req.method === 'POST' && url === '/painel/login' && req.headers.origin)", "if (req.method === 'POST' && url === '/painel/login')"],
  ['rotas de escrita', "// Requisicoes de escrita feitas por navegadores", "if (req.method === 'GET' && (url === '/painel'"],
]) {
  test('Origin estrito: ' + nome, () => {
    const a = fonte.indexOf(inicio);
    const b = fonte.indexOf(fim, a + inicio.length);
    assert.ok(a >= 0 && b > a, 'bloco nao encontrado: ' + nome);
    const trecho = fonte.slice(a, b);
    for (const filtro of ['username', 'password', 'pathname', 'search', 'hash', 'host', 'x-forwarded-proto']) {
      assert.ok(trecho.includes(filtro), 'filtro ausente: ' + filtro);
    }
    assert.match(trecho, /protocol === 'https:'/);
  });
}
