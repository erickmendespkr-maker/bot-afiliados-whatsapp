import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');

test('login posts the credential in a header, never in the browser URL', () => {
  assert.match(painel, /fetch\('\/painel\/login',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'x-painel-token':\s*valor/);
  assert.match(painel, /location\.replace\('\/painel'\)/);
  assert.doesNotMatch(painel, /location\.(?:href|replace|assign)\s*(?:=|\()\s*[`'"]?\/painel\?t=/);
});

test('login creates a random, bounded, HTTP-only session cookie', () => {
  assert.match(painel, /randomBytes\(32\)\.toString\('hex'\)/);
  assert.match(painel, /sessoesPainel\.set\(sessao, agora \+ 12 \* 60 \* 60 \* 1000\)/);
  assert.match(painel, /painel_session=\$\{sessao\}; HttpOnly; SameSite=Strict; Path=\/painel; Max-Age=43200/);
  assert.match(painel, /seguro \? '; Secure' : ''/);
});

test('session cookie is restricted to panel HTML reads, not write authorization', () => {
  assert.match(painel, /!informado && req\.method === 'GET' && url\.pathname === '\/painel'/);
  assert.match(painel, /if \(url\.startsWith\('\/painel'\) && !autorizado\(req\)\)/);
});
