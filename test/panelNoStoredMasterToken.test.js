import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');

test('login page never stores master token in browser localStorage', () => {
  assert.doesNotMatch(source, /localStorage\.(?:setItem|getItem)\(['"]painelToken['"]/);
  assert.match(source, /fetch\(['"]\/painel\/login['"]/);
  assert.match(source, /['"]x-painel-token['"]:\s*valor/);
});

test('login page relies on session cookie, not persisted master token', () => {
  assert.doesNotMatch(source, /localStorage\.setItem\(['"]painelToken['"]/);
  assert.match(source, /location\.replace\(['"]\/painel['"]\)/);
});
