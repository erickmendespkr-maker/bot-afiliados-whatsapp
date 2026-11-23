import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('extension offer input is validated before affiliate conversion', () => {
  const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
  const validation = source.indexOf("const camposTexto = [source, productUrl, title, price]");
  const conversion = source.indexOf("affiliateLink = buildAffiliateLink(source, productUrl)");
  assert.ok(validation > 0 && conversion > validation);
  assert.match(source, /camposTexto\.every\(\(valor\) => typeof valor === 'string'/);
  assert.match(source, /\['mercadolivre', 'amazon'\]\.includes\(source\)/);
  assert.match(source, /typeof valor !== 'string'/);
  assert.match(source, /Campos da oferta invalidos/);
});
