import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Executa apenas a funcao de autorizacao original, sem iniciar WhatsApp,
// acessar credenciais ou carregar dependencias de rede.
const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const start = source.indexOf('export function autorizado(req) {');
const end = source.indexOf('\n// Trata as rotas do painel.', start);
assert.ok(start >= 0 && end > start, 'funcao autorizado deve existir');
const code = source.slice(start, end).replace('export function', 'function') + '\nautorizado;';
function check({ token = 'segredo-longo', url = '/painel/status', headers = {}, remoteAddress = '203.0.113.7', env = {} } = {}) {
  const context = vm.createContext({
    config: { painel: { token, naRede: true, tunelAutomatico: false } },
    process: { env },
    Buffer,
    timingSafeEqual: (a, b) => {
      assert.equal(a.length, b.length);
      return Buffer.compare(a, b) === 0;
    },
    ehLocal: () => remoteAddress === '127.0.0.1',
    URL,
  });
  const autorizado = vm.runInContext(code, context);
  return autorizado({ url, headers, socket: { remoteAddress } });
}
test('bloqueia sem token e com token incorreto', () => {
  assert.equal(check(), false);
  assert.equal(check({ url: '/painel/status?t=errado' }), false);
});
test('aceita token correto por cabecalho ou query', () => {
  assert.equal(check({ headers: { 'x-painel-token': 'segredo-longo' } }), true);
  assert.equal(check({ url: '/painel/status?t=segredo-longo' }), true);
});
test('nao libera acesso remoto com segredo vazio', () => {
  assert.equal(check({ token: '', url: '/painel/status?t=qualquer' }), false);
});
test('token incorreto na query nao e substituido pelo cabecalho', () => {
  assert.equal(check({ url: '/painel?t=errado', headers: { 'x-painel-token': 'segredo-longo' } }), false);
});
