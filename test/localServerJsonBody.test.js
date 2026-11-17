import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { PassThrough } from 'node:stream';

// Exercise the real request-body parser without importing WhatsApp, starting
// the bot, or enabling any external sends.
const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const start = source.indexOf('function readJsonBody(req) {');
const end = source.indexOf('\nfunction sendJson(', start);
assert.ok(start >= 0 && end > start, 'readJsonBody must exist');
const readJsonBody = runInNewContext(source.slice(start, end) + '\nreadJsonBody;', { Buffer, Promise, Error, Object, JSON });

async function parse(body) {
  const request = new PassThrough();
  const result = readJsonBody(request);
  request.end(body);
  return result;
}

test('HTTP body parser accepts valid objects and empty requests', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(await parse('{"source":"mercadolivre"}'))), { source: 'mercadolivre' });
  assert.deepEqual(JSON.parse(JSON.stringify(await parse(''))), {});
});

test('HTTP body parser rejects malformed JSON with status 400', async () => {
  await assert.rejects(parse('{"source":'), (err) => err.statusCode === 400);
});

test('HTTP body parser rejects payloads larger than 1 MB with status 413', async () => {
  await assert.rejects(parse('x'.repeat(1_000_001)), (err) => err.statusCode === 413);
});

test('HTTP body parser accepts exactly 1 MB and rejects the next byte', async () => {
  const valid = JSON.stringify({ data: 'x'.repeat(1_000_000 - 11) });
  assert.equal(Buffer.byteLength(valid), 1_000_000);
  const parsed = await parse(valid);
  assert.equal(parsed.data.length, 1_000_000 - 11);
  await assert.rejects(parse(valid + ' '), (err) => err.statusCode === 413);
});

test('HTTP body parser rejects an aborted request without hanging', async () => {
  const request = new PassThrough();
  const pending = readJsonBody(request);
  request.write('{"partial":');
  request.emit('aborted');
  await assert.rejects(pending, (err) => err.statusCode === 400);
  request.destroy();
});

test('HTTP body parser propagates stream errors', async () => {
  const request = new PassThrough();
  const pending = readJsonBody(request);
  const failure = new Error('stream failed');
  request.emit('error', failure);
  await assert.rejects(pending, (err) => err === failure);
  request.destroy();
});
