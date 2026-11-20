import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { timingSafeEqual } from 'node:crypto';

// Exercita a autenticacao existente sem carregar Baileys ou abrir conexao externa.
const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const start = source.indexOf('const sessoesPainel = new Map();');
const end = source.indexOf('// Trata as rotas do painel.', start);
assert.ok(start !== -1 && end > start, 'bloco de autenticacao encontrado');
const context = {
  Map, URL, Buffer, Date, timingSafeEqual,
  config: { painel: { naRede: true, token: 'segredo-de-teste' } },
  process: { env: { PORT: '10000' } },
  ehLocal: () => false
};
const { autorizado, sessoesPainel } = runInNewContext(
  source.slice(start, end).replace('export function autorizado', 'function autorizado') +
  '\n({ autorizado, sessoesPainel })',
  context
);
sessoesPainel.set('sessao-valida', Date.now() + 60_000);
function requisicao(origin, host = 'painel.example.com') {
  return {
    method: 'POST',
    url: '/painel/pausar',
    headers: {
      host,
      cookie: 'painel_session=sessao-valida',
      ...(origin === undefined ? {} : { origin })
    },
    socket: { remoteAddress: '127.0.0.1' }
  };
}

test('proxy HTTPS: cookie autentica escrita apenas na origem publica exata', () => {
  assert.equal(autorizado(requisicao('https://painel.example.com')), true);
  assert.equal(autorizado(requisicao('http://painel.example.com')), true); // HTTP direto, sem proxy HTTPS
  assert.equal(autorizado(requisicao('https://outro.example.com')), false);
  assert.equal(autorizado(requisicao('https://painel.example.com.evil.test')), false);
  assert.equal(autorizado(requisicao('https://painel.example.com:444')), false);
});

test('headers forwarded nao substituem Host para autorizar cookies', () => {
  const req = requisicao('https://painel.example.com', 'internal-service:10000');
  req.headers['x-forwarded-host'] = 'painel.example.com';
  req.headers['x-forwarded-proto'] = 'https';
  assert.equal(autorizado(req), false);
});

test('origens ausentes, malformadas ou opacas nao autorizam escrita por cookie', () => {
  for (const origin of [undefined, 'null', 'not a url', 'file:///tmp/test.html']) {
    assert.equal(autorizado(requisicao(origin)), false);
  }
});

test('sessao expirada ou inexistente nao autoriza escrita', () => {
  sessoesPainel.set('sessao-expirada', Date.now() - 1);
  const expirada = requisicao('https://painel.example.com');
  expirada.headers.cookie = 'painel_session=sessao-expirada';
  assert.equal(autorizado(expirada), false);
  assert.equal(sessoesPainel.has('sessao-expirada'), false);
  const inexistente = requisicao('https://painel.example.com');
  inexistente.headers.cookie = 'painel_session=nao-existe';
  assert.equal(autorizado(inexistente), false);
});

test('cookie de sessao nao autoriza POST fora das rotas do painel', () => {
  const req = requisicao('https://painel.example.com');
  req.url = '/post';
  assert.equal(autorizado(req), false);
});

test('token de cabecalho incorreto nao ganha acesso por cookie valido', () => {
  const req = requisicao('https://painel.example.com');
  req.headers['x-painel-token'] = 'token-incorreto';
  assert.equal(autorizado(req), false);
});


test('proxy HTTPS rejeita Origin HTTP mesmo com Host identico', () => {
  const req = requisicao('http://painel.example.com');
  req.headers['x-forwarded-proto'] = 'https';
  assert.equal(autorizado(req), false);
  req.headers.origin = 'https://painel.example.com';
  assert.equal(autorizado(req), true);
});
