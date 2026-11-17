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
