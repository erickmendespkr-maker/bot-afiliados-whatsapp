import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercita o parser real do servidor, sem importar dependencias externas,
// conectar WhatsApp ou permitir envios.
const code = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = code.indexOf('function readJsonBody(req) {');
const end = code.indexOf('\nfunction sendJson(', start);
assert.ok(start >= 0 && end > start, 'parser HTTP original encontrado');
const readJsonBody = runInNewContext(code.slice(start, end) + '\nreadJsonBody', {
  Buffer, Promise, Error, Object, JSON
});

async function parse(chunks) {
  const req = new EventEmitter();
  req.resume = () => {};
  const result = readJsonBody(req);
  for (const chunk of chunks) req.emit('data', Buffer.from(chunk));
  req.emit('end');
  return result;
}

test('parser aceita JSON dividido em chunks', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(await parse(['{"source":', '"amazon"}']))), { source: 'amazon' });
});

test('parser trata corpo vazio como objeto vazio', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(await parse([]))), {});
});

test('parser rejeita JSON malformado com 400', async () => {
  await assert.rejects(parse(['{invalid']), err => err.statusCode === 400);
});

test('parser rejeita corpo acima de 1 MB com 413', async () => {
  await assert.rejects(parse(['x'.repeat(1000001)]), err => err.statusCode === 413);
});

test('parser preserva null e arrays para validacao do handler', async () => {
  assert.equal(await parse(['null']), null);
  assert.equal(Array.isArray(await parse(['[]'])), true);
});

test('parser rejeita requisicao abortada sem aguardar end', async () => {
  const req = new EventEmitter();
  req.resume = () => {};
  const pending = readJsonBody(req);
  req.emit('data', Buffer.from('{"source":'));
  req.emit('aborted');
  await assert.rejects(pending, err => err.statusCode === 400);
});

test('parser rejeita erro de transporte sem aguardar end', async () => {
  const req = new EventEmitter();
  req.resume = () => {};
  const pending = readJsonBody(req);
  req.emit('error', new Error('socket reset'));
  await assert.rejects(pending, /socket reset/);
});
