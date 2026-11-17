import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Contrato de integracao: painel usa o motor original, sem segunda sessao
// WhatsApp e sem render-preview como servidor de producao.
test('index inicializa servidor antes de aguardar QR do WhatsApp', () => {
  const src = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const bloco = src.slice(src.indexOf('} else {\n    // Se a sessao salva'));
  assert.match(bloco, /startLocalServer\(\);\s*await connectWhatsApp\(/);
  assert.match(src, /setLatestQr\(qr\)/);
});
test('servidor real delega ao painel e ao envio existentes', () => {
  const src = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
  assert.match(src, /tratarRotaDoPainel\(req, res, sendJson, readJsonBody\)/);
  assert.match(src, /sendDealToGroups\(config\.whatsapp\.groupJids/);
  assert.doesNotMatch(src, /render-preview\.js/);
});
test('painel reutiliza socket e QR do modulo WhatsApp', () => {
  const src = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
  assert.match(src, /getLatestQr\(\)/);
  assert.match(src, /getSocket\(\)/);
  assert.match(src, /listGroups\(sock\)/);
});
