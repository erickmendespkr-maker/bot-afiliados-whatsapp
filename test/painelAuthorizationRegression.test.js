import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { timingSafeEqual } from 'node:crypto';

// Testa a funcao de autenticacao original sem iniciar WhatsApp ou servidor.
const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const start = source.indexOf('const sessoesPainel = new Map();');
const end = source.indexOf('// Trata as rotas do painel.', start);
assert.ok(start >= 0 && end > start, 'autenticacao original encontrada');
const context = {
  Map, URL, Buffer, Date, timingSafeEqual,
  config: { painel: { naRede: true, token: 'token-de-teste' } },
  process: { env: { PORT: '4545' } },
  ehLocal: () => false
};
const { autorizado, sessoesPainel } = runInNewContext(
  source.slice(start, end).replace('export function autorizado', 'function autorizado') +
  '\n({ autorizado, sessoesPainel })', context
);
function request(path, method = 'GET', headers = {}) {
  return { url: path, method, headers, socket: { remoteAddress: '127.0.0.1' } };
}

test('nuvem: loopback sem token nao concede acesso', () => {
  assert.equal(autorizado(request('/painel')), false);
  assert.equal(autorizado(request('/post', 'POST')), false);
});

test('token mestre autentica e token incorreto nao autentica', () => {
  assert.equal(autorizado(request('/painel', 'GET', { 'x-painel-token': 'token-de-teste' })), true);
  assert.equal(autorizado(request('/painel', 'GET', { 'x-painel-token': 'incorreto' })), false);
});

test('cookie de sessao permite leitura, mas nao escrita sem Origin seguro', () => {
  sessoesPainel.set('sessao-teste', Date.now() + 60_000);
  const cookie = { cookie: 'painel_session=sessao-teste', host: 'localhost:4545' };
  assert.equal(autorizado(request('/painel/status', 'GET', cookie)), true);
  assert.equal(autorizado(request('/painel/pausar', 'POST', cookie)), false);
  assert.equal(autorizado(request('/painel/pausar', 'POST', { ...cookie, origin: 'https://evil.example' })), false);
  assert.equal(autorizado(request('/painel/pausar', 'POST', { ...cookie, origin: 'http://localhost:4545' })), true);
  assert.equal(autorizado(request('/post', 'POST', { ...cookie, origin: 'http://localhost:4545' })), false);
});

test('sessao expirada nao concede acesso', () => {
  sessoesPainel.set('expirada', Date.now() - 1);
  assert.equal(autorizado(request('/painel', 'GET', { cookie: 'painel_session=expirada' })), false);
});
