import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Guard against accidentally dropping proxy downgrade and URL component checks
// from the shared write-route Origin validation. No WhatsApp connection needed.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, 'src/painel.js'), 'utf8');
const start = source.indexOf('// Requisicoes de escrita feitas por navegadores');
const end = source.indexOf("if (req.method === 'GET' && (url === '/painel'", start);
test('write routes reject proxy HTTPS downgrade and Origin URL components', () => {
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  for (const expected of [
    "parsed.protocol === 'https:'",
    '!parsed.username', '!parsed.password',
    "parsed.pathname === '/'", '!parsed.search', '!parsed.hash',
    'parsed.host === req.headers.host',
  ]) assert.ok(block.includes(expected), 'missing Origin check: ' + expected);
});
