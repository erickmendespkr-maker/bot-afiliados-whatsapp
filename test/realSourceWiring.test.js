import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

// Diferente dos fixtures do readiness, estes testes inspecionam os arquivos
// reais versionados. Nao conectam WhatsApp nem habilitam qualquer envio.
test('servidor real delega painel e protege /post', () => {
  const server = source('src/localServer.js');
  assert.match(server, /import\s*\{[^}]*tratarRotaDoPainel[^}]*autorizado[^}]*\}\s*from\s*['"]\.\/painel\.js['"]/s);
  assert.match(server, /if\s*\(!autorizado\(req\)\)/);
  assert.match(server, /tratarRotaDoPainel\(req,\s*res,\s*sendJson,\s*readJsonBody\)/);
  assert.match(server, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(server, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(server, /sendDealToGroups\(/);
});

test('painel real contem rotas operacionais e bloqueios de envio', () => {
  const panel = source('src/painel.js');
  for (const route of ['status', 'grupos', 'origens', 'destinos', 'qr', 'afiliados', 'operacao', 'simular-oferta', 'enviar']) {
    assert.ok(panel.includes('/painel/' + route), 'rota ausente: ' + route);
  }
  assert.match(panel, /export function autorizado\(req\)/);
  assert.match(panel, /timingSafeEqual/);
  assert.match(panel, /AUTORIZAR_ENVIO_PAINEL/);
  assert.match(panel, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(panel, /simulacao:\s*true/);
  assert.match(panel, /enviado:\s*false/);
  assert.match(panel, /getLatestQr/);
  assert.match(panel, /definirPausa/);
});

test('painel nao depende do render-preview como aplicacao final', () => {
  const entry = source('index.js');
  const server = source('src/localServer.js');
  assert.match(entry, /startLocalServer/);
  assert.doesNotMatch(entry + server, /render-preview\.js/);
});
