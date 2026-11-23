import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');

test('painel final inicia pelo motor e nao pelo render-preview', () => {
  assert.match(index, /import\s*\{[^}]*startLocalServer[^}]*\}\s*from\s*['"]\.\/src\/localServer\.js['"]/);
  assert.doesNotMatch(index, /render-preview\.js/);
  assert.match(server, /tratarRotaDoPainel\(req, res, sendJson, readJsonBody\)/);
});

test('servidor trata falhas async da rota de publicacao', () => {
  assert.match(server, /handlePost\(req, res\)\.catch\(/);
  assert.match(server, /!res\.headersSent/);
});

test('modo teste nao liga WhatsApp e so inicia painel por opt-in', () => {
  assert.match(index, /config\.dryRun\s*&&\s*process\.env\.PAINEL_NO_DRY_RUN\s*===\s*'sim'/);
  assert.match(index, /if\s*\(config\.dryRun\)[\s\S]*?else\s*\{[\s\S]*?connectWhatsApp\(/);
});

test('envios pela extensao exigem autorizacao e destinos confirmados', () => {
  assert.match(server, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(server, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(server, /config\.dryRun/);
  assert.match(server, /estaPausado\(\)/);
});


test('painel dry-run nao exige credenciais nem inicia coleta automatica', () => {
  const guard = index.indexOf("if (config.dryRun && process.env.PAINEL_NO_DRY_RUN === 'sim')", index.indexOf('startGroupReader();'));
  assert.ok(guard > 0, 'guarda do painel-only deve existir apos inicializacao');
  const remainder = index.slice(guard);
  assert.match(remainder, /logger\.info\('Painel de configuracao ativo em modo teste; coleta e envios desabilitados\.'\);\s*return;/);
  assert.ok(guard < index.indexOf('await runPollCycle()'), 'painel-only deve retornar antes da coleta');
  assert.ok(guard < index.indexOf('if (config.dryRun) validateConfig()'), 'painel-only deve retornar antes da validacao de credenciais');
});
