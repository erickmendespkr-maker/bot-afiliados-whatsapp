import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Executa a validacao de Origin da rota /post sem carregar WhatsApp nem enviar ofertas.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = source.indexOf('        let mesmaOrigem = false;', source.indexOf("pathname === '/post'"));
const end = source.indexOf('        if (!mesmaOrigem)', start);
assert.ok(start !== -1 && end > start, 'validacao de Origin de /post encontrada');
const trecho = source.slice(start, end);
function permite(origin, host = 'painel.example.com', forwardedProto) {
  const req = { headers: { origin, host, ...(forwardedProto ? { 'x-forwarded-proto': forwardedProto } : {}) } };
  return runInNewContext('(function(req) { ' + trecho + ' return mesmaOrigem; })(req)', { req, URL });
}
test('/post bloqueia downgrade HTTP quando proxy informa HTTPS', () => {
  assert.equal(permite('http://painel.example.com', 'painel.example.com', 'https'), false);
  assert.equal(permite('https://painel.example.com', 'painel.example.com', 'https'), true);
  assert.equal(permite('http://painel.example.com', 'painel.example.com', 'https,http'), false);
});
test('/post preserva origem HTTP no servidor local sem proxy HTTPS', () => {
  assert.equal(permite('http://127.0.0.1:4545', '127.0.0.1:4545'), true);
  assert.equal(permite('https://outro.example.com', 'painel.example.com', 'https'), false);
  assert.equal(permite('null', 'painel.example.com', 'https'), false);
  assert.equal(permite('https://painel.example.com.evil.test', 'painel.example.com', 'https'), false);
});
