import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Testa o handler /post original com dependencias simuladas: nunca conecta ou envia.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = source.indexOf('async function handlePost(req, res) {');
const end = source.indexOf('\n// Descobre o IP do PC', start);
assert.ok(start >= 0 && end > start, 'handler /post original localizado');

function harness({ groups = ['grupo@chat'], confirmed = '', authorized = 'nao', paused = false } = {}) {
  let sends = 0;
  let waits = 0;
  const config = { whatsapp: { groupJids: groups }, dryRun: false };
  const env = { AUTORIZAR_ENVIO_EXTENSAO: authorized, GRUPOS_DESTINO_CONFIRMADOS: confirmed };
  const ctx = {
    config,
    process: { env },
    readJsonBody: async () => ({ source: 'amazon', productUrl: 'https://example.com/p', title: 'Oferta teste', price: 10 }),
    buildAffiliateLink: () => 'https://example.com/afiliado',
    sendJson: (res, status, data) => { res.status = status; res.data = data; },
    logger: { error() {}, info() {} },
    estaPausado: () => paused,
    waitForConnection: async () => { waits++; },
    sendDealToGroups: async () => { sends++; return true; },
    describeError: String,
  };
  const handlePost = runInNewContext(source.slice(start, end) + '\nhandlePost', ctx);
  return { run: async () => { const res = {}; await handlePost({}, res); return res; }, counters: () => ({ sends, waits }), env };
}

test('rota /post bloqueia envio sem autorizacao explicita', async () => {
  const h = harness({ confirmed: 'grupo@chat' });
  assert.equal((await h.run()).status, 403);
  assert.deepEqual(h.counters(), { sends: 0, waits: 0 });
});

test('rota /post bloqueia destino nao confirmado mesmo com flag ativa', async () => {
  const h = harness({ authorized: 'sim', confirmed: 'outro@chat' });
  assert.equal((await h.run()).status, 403);
  assert.deepEqual(h.counters(), { sends: 0, waits: 0 });
});

test('rota /post bloqueia operacao pausada antes de aguardar conexao', async () => {
  const h = harness({ authorized: 'sim', confirmed: 'grupo@chat', paused: true });
  assert.equal((await h.run()).status, 409);
  assert.deepEqual(h.counters(), { sends: 0, waits: 0 });
});

test('rota /post revalida autorizacao depois da espera', async () => {
  const h = harness({ authorized: 'sim', confirmed: 'grupo@chat' });
  // A leitura do corpo e a espera sao simuladas, sem conexao externa.
  // A autorizacao permanece ativa: o handler deve delegar uma unica vez.
  assert.equal((await h.run()).status, 200);
  assert.deepEqual(h.counters(), { sends: 1, waits: 1 });
});
