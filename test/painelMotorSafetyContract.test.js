import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
const servidor = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
const entrada = readFileSync(new URL('../index.js', import.meta.url), 'utf8');

test('QR web vem da conexao original e permanece em rota do painel', () => {
  assert.match(entrada, /setLatestQr\(qr\)/);
  assert.match(painel, /getLatestQr\(/);
  assert.match(painel, /\/painel\/qr/);
  assert.match(painel, /QRCode\./);
});

test('painel remoto exige credencial e nao aceita cookie em escrita sem Origin valido', () => {
  assert.match(painel, /if \(!esperado\) return false/);
  assert.match(painel, /req\.method === 'POST' && origemSegura/);
  assert.match(painel, /timingSafeEqual\(/);
  assert.match(painel, /HttpOnly/);
});

test('motor original e responsavel pela publicacao e nao o preview', () => {
  assert.match(entrada, /startLocalServer\(/);
  assert.match(servidor, /tratarRotaDoPainel\(/);
  assert.match(servidor, /sendDealToGroups\(/);
  assert.doesNotMatch(entrada, /render-preview\.js/);
});

test('publicacao HTTP continua bloqueada sem consentimento e destinos confirmados', () => {
  assert.match(servidor, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(servidor, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(servidor, /config\.dryRun/);
  assert.match(servidor, /estaPausado\(\)/);
});
