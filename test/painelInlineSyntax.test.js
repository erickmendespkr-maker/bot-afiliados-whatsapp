import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

// Static source check: no WhatsApp connection, credentials or network required.
// Validate browser scripts separately: node --check src/painel.js alone does not
// parse JavaScript embedded inside HTML template literals.
const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const scripts = [...source.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)]
  .map((match) => match[1]);

test('login and dashboard inline scripts remain syntactically valid', () => {
  assert.equal(scripts.length, 2, 'Expected login and dashboard inline scripts');
  for (const [index, script] of scripts.entries()) {
    // __ERROU__ is a valid JS identifier; this is syntax validation only.
    assert.doesNotThrow(() => new Script(script, { filename: `painel-inline-${index + 1}.js` }));
  }
});

test('dashboard retains authenticated fetch helper', () => {
  assert.match(scripts[1], /x-painel-token/);
});
