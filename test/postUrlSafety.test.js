import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Contrato offline da entrada HTTP; nao inicia o bot nem envia mensagens.
test('rota /post valida URL antes de invocar o conversor de afiliados', () => {
  const source = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
  const parse = source.indexOf('urlProduto = new URL(productUrl)');
  const protocol = source.indexOf("['http:', 'https:'].includes(urlProduto.protocol)");
  const credentials = source.indexOf('urlProduto.username || urlProduto.password');
  const conversion = source.indexOf('affiliateLink = buildAffiliateLink(source, productUrl)');
  assert.ok(parse > 0 && protocol > parse && credentials > protocol && conversion > credentials);
});

test('URL parser rejeita esquemas executaveis e credenciais embutidas', () => {
  const valid = (value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) &&
        !url.username && !url.password;
    } catch { return false; }
  };
  assert.equal(valid('https://www.mercadolivre.com.br/produto'), true);
  assert.equal(valid('http://www.amazon.com.br/produto'), true);
  for (const value of ['javascript:alert(1)', 'data:text/plain,abc',
    'https://usuario:senha@exemplo.com/p', 'not-a-url', 'file:///etc/passwd']) {
    assert.equal(valid(value), false, value);
  }
});
