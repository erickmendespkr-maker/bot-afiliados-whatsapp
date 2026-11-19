import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercita o handler /post original sem carregar WhatsApp, cron ou credenciais.
// Nenhuma chamada de envio e possivel: a funcao de envio e um stub que falha.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const parserStart = source.indexOf('function readJsonBody(req) {');
const handlerEnd = source.indexOf('// Descobre o IP do PC', parserStart);
assert.ok(parserStart >= 0 && handlerEnd > parserStart, 'handlers originais encontrados');
const sendCalls = [];
const context = {
  Buffer, Promise, Error, Object, JSON, Set, process: { env: {} },
  config: { whatsapp: { groupJids: [] }, dryRun: true },
  logger: { error() {}, info() {} },
  describeError: () => 'erro',
  buildAffiliateLink: () => { throw new Error('nao deveria converter'); },
  waitForConnection: () => { throw new Error('nao deveria conectar'); },
  sendDealToGroups: () => { sendCalls.push(true); throw new Error('envio proibido'); },
  estaPausado: () => true
};
const { handlePost } = runInNewContext(
  source.slice(parserStart, handlerEnd) + '\n({ handlePost })', context
);

async function withServer(callback) {
  const server = createServer((req, res) => {
    void handlePost(req, res).catch(err => {
      if (!res.headersSent) res.writeHead(500);
      res.end(String(err.message));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await callback('http://127.0.0.1:' + server.address().port);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

test('POST /post: raizes JSON nao-objeto retornam 400 sem acionar motor', async () => {
  await withServer(async url => {
    for (const body of ['null', '[]', '42', 'true', '"texto"']) {
      const response = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body
      });
      assert.equal(response.status, 400, 'corpo: ' + body);
      assert.equal((await response.json()).ok, false);
    }
    const response = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
    });
    assert.equal(response.status, 400, 'objeto sem campos obrigatorios');
  });
  assert.equal(sendCalls.length, 0, 'nenhuma tentativa de envio');
});
