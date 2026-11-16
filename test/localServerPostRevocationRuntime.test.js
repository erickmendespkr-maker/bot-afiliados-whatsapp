import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercita a revalidacao do handler original sem conectar ao WhatsApp.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = source.indexOf('async function handlePost(req, res) {');
const end = source.indexOf('\n// Descobre o IP do PC', start);
assert.ok(start >= 0 && end > start, 'handler /post original localizado');

function harness(onWait) {
  const env = {
    AUTORIZAR_ENVIO_EXTENSAO: 'sim',
    GRUPOS_DESTINO_CONFIRMADOS: 'grupo@chat',
  };
  let paused = false;
  let sends = 0;
  const ctx = {
    config: { whatsapp: { groupJids: ['grupo@chat'] }, dryRun: false },
    process: { env },
    readJsonBody: async () => ({
      source: 'amazon',
      productUrl: 'https://example.com/produto',
      title: 'Oferta simulada',
      price: 10,
    }),
    buildAffiliateLink: () => 'https://example.com/afiliado',
    sendJson: (res, status, data) => { res.status = status; res.data = data; },
    logger: { error() {}, info() {} },
    estaPausado: () => paused,
    waitForConnection: async () => { await onWait({ env, pause: () => { paused = true; } }); },
    sendDealToGroups: async () => { sends++; return true; },
    describeError: String,
  };
  const handler = runInNewContext(source.slice(start, end) + '\nhandlePost', ctx);
  return {
    run: async () => {
      const res = {};
      await handler({}, res);
      return { status: res.status, sends };
    },
  };
}

test('revogacao da autorizacao enquanto espera conexao impede envio', async () => {
  const h = harness(async ({ env }) => {
    env.AUTORIZAR_ENVIO_EXTENSAO = 'nao';
  });
  assert.deepEqual(await h.run(), { status: 403, sends: 0 });
});

test('troca de destinos confirmados enquanto espera conexao impede envio', async () => {
  const h = harness(async ({ env }) => {
    env.GRUPOS_DESTINO_CONFIRMADOS = 'outro@chat';
  });
  assert.deepEqual(await h.run(), { status: 403, sends: 0 });
});

test('pausa enquanto espera conexao impede envio', async () => {
  const h = harness(async ({ pause }) => { pause(); });
  assert.deepEqual(await h.run(), { status: 409, sends: 0 });
});
