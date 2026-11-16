import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Executa o handler original em isolamento, sem rede, WhatsApp ou envio real.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = source.indexOf('async function handlePost(req, res) {');
const end = source.indexOf('\n// Descobre o IP do PC', start);
assert.ok(start >= 0 && end > start);

function harness(body, { dryRun = false } = {}) {
  let sent = 0;
  let waited = 0;
  const res = {};
  const context = {
    config: { whatsapp: { groupJids: ['grupo@chat'] }, dryRun },
    process: { env: { AUTORIZAR_ENVIO_EXTENSAO: 'sim', GRUPOS_DESTINO_CONFIRMADOS: 'grupo@chat' } },
    readJsonBody: async () => body,
    buildAffiliateLink: () => 'https://example.com/afiliado',
    sendJson: (_res, status, data) => { res.status = status; res.data = data; },
    logger: { error() {}, info() {} },
    estaPausado: () => false,
    waitForConnection: async () => { waited++; },
    sendDealToGroups: async () => { sent++; return true; },
    describeError: String,
  };
  const handler = runInNewContext(source.slice(start, end) + '\nhandlePost', context);
  return { run: async () => { await handler({}, res); return res; }, counters: () => ({ sent, waited }) };
}

test('POST /post rejeita corpo JSON null sem acionar o motor', async () => {
  const h = harness(null);
  assert.equal((await h.run()).status, 400);
  assert.deepEqual(h.counters(), { sent: 0, waited: 0 });
});

test('POST /post rejeita array JSON sem acionar o motor', async () => {
  const h = harness([]);
  assert.equal((await h.run()).status, 400);
  assert.deepEqual(h.counters(), { sent: 0, waited: 0 });
});

test('POST /post rejeita campos obrigatorios ausentes sem acionar o motor', async () => {
  const h = harness({ source: 'amazon', title: 'Teste' });
  assert.equal((await h.run()).status, 400);
  assert.deepEqual(h.counters(), { sent: 0, waited: 0 });
});

test('POST /post nao envia em dry-run mesmo com destinos confirmados', async () => {
  const h = harness({ source: 'amazon', productUrl: 'https://example.com/p', title: 'Teste', price: 10 }, { dryRun: true });
  assert.equal((await h.run()).status, 403);
  assert.deepEqual(h.counters(), { sent: 0, waited: 0 });
});
