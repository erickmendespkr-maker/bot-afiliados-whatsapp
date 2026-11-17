import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');

test('rotas do painel desabilitam cache antes de qualquer resposta privada', () => {
  const inicio = painel.indexOf('export function tratarRotaDoPainel(');
  const noStore = painel.indexOf("res.setHeader('Cache-Control', 'no-store, private')", inicio);
  const primeiraRota = painel.indexOf("if (req.method === 'GET'", inicio);
  assert.ok(inicio >= 0 && noStore > inicio && noStore < primeiraRota);
});

test('QR autenticado desabilita cache explicitamente', () => {
  const inicio = painel.indexOf("url === '/painel/qr'");
  const fim = painel.indexOf("url === '/painel/operacao'", inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  assert.match(painel.slice(inicio, fim), /'Cache-Control': 'no-store'/);
});

test('cache de 24 horas fica restrito ao icone publico do PWA', () => {
  const linhas = painel.split('\n').filter((linha) => linha.includes('max-age=86400'));
  assert.equal(linhas.length, 1);
  assert.match(linhas[0], /image\/svg\+xml/);
});
