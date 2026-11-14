import test from 'node:test';
import assert from 'node:assert/strict';
import { estaPausado, definirPausa } from '../src/operationControl.js';

test('motor inicia pausado por seguranca', () => {
  assert.equal(estaPausado(), true);
});

test('retomar e pausar alteram o estado do motor', () => {
  assert.equal(definirPausa(false), false);
  assert.equal(estaPausado(), false);
  assert.equal(definirPausa(true), true);
  assert.equal(estaPausado(), true);
});

test('valores invalidos nao alteram o estado operacional', () => {
  for (const valor of [undefined, null, 0, 1, 'false', 'true', {}, []]) {
    assert.throws(() => definirPausa(valor), TypeError);
    assert.equal(estaPausado(), true);
  }
});
