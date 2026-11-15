import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Testa HTTP de verdade no loopback, sem importar WhatsApp, executar
// o agendador ou habilitar qualquer envio.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = source.indexOf('function readJsonBody(req) {');
const end = source.indexOf('\nfunction sendJson(', start);
assert.ok(start >= 0 && end > start, 'parser original encontrado');
const readJsonBody = runInNewContext(source.slice(start, end) + '\nreadJsonBody', {
  Buffer, Promise, Error, Object, JSON
});

async function withServer(callback) {
  const server = createServer((req, res) => {
    void readJsonBody(req).then(body => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ body }));
    }).catch(err => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(err.statusCode || 500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
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

test('HTTP real: JSON fragmentado chega completo', async () => {
  await withServer(async url => {
    const response = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'amazon', title: 'teste' })
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).body, { source: 'amazon', title: 'teste' });
  });
});

test('HTTP real: JSON malformado retorna 400', async () => {
  await withServer(async url => {
    const response = await fetch(url, { method: 'POST', body: '{invalid' });
    assert.equal(response.status, 400);
  });
});

test('HTTP real: corpo maior que 1 MB retorna 413 sem derrubar servidor', async () => {
  await withServer(async url => {
    const response = await fetch(url, { method: 'POST', body: 'x'.repeat(1_000_001) });
    assert.equal(response.status, 413);
    const followup = await fetch(url, { method: 'POST', body: '{}' });
    assert.equal(followup.status, 200);
  });
});
