import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = join(dirname(dirname(fileURLToPath(import.meta.url))), 'scripts/check-mvp-readiness.js');
const jidA = '120363000001@g.us';
const jidB = '120363000002@g.us';

function runReadiness(envFile, overrides = {}, omittedFiles = []) {
  const cwd = mkdtempSync(join(tmpdir(), 'mvp-readiness-'));
  try {
    for (const file of ['index.js', 'src/localServer.js', 'src/painel.js', 'src/whatsapp/connection.js', 'src/whatsapp/sender.js']) {
      if (omittedFiles.includes(file)) continue;
      mkdirSync(dirname(join(cwd, file)), { recursive: true });
      const fixtures = {
        'index.js': "from './src/localServer.js'\nstartLocalServer()",
        'src/localServer.js': "from './painel.js'\ntratarRotaDoPainel(req, res\nsendDealToGroups(",
        'src/painel.js': [
          'export function autorizado(req)', 'getLatestQr', 'definirPausa',
          ...['status', 'grupos', 'origens', 'destinos', 'qr', 'afiliados', 'operacao', 'simular-oferta', 'lista'].map((route) => "url === '/painel/" + route + "'"),
          'painel_session=', 'HttpOnly', 'cookiePermitido', 'origemSegura',
          "AUTORIZAR_ENVIO_PAINEL: 'nao'", "AUTORIZAR_ENVIO_WHATSAPP: 'nao'",
          'simulacao: true, enviado: false',
        ].join('\n'),
      };
      writeFileSync(join(cwd, file), fixtures[file] || '');
    }
    if (envFile) writeFileSync(join(cwd, '.env'), envFile);
    const clean = { ...process.env };
    for (const key of ['PORT', 'RENDER', 'RENDER_SERVICE_ID', 'PAINEL_NA_REDE', 'PAINEL_TUNEL_AUTOMATICO',
      'PAINEL_TOKEN', 'AUTORIZAR_ENVIO_EXTENSAO', 'AUTORIZAR_ENVIO_PAINEL',
      'AUTORIZAR_ENVIO_WHATSAPP', 'WHATSAPP_GROUP_JIDS', 'WHATSAPP_GROUP_JID', 'GRUPOS_DESTINO_CONFIRMADOS']) {
      delete clean[key];
    }
    const result = spawnSync(process.execPath, [script], {
      cwd, env: { ...clean, ...overrides }, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null, 'diagnostic must exit normally');
    return { output: result.stdout, status: result.status };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function check(result, label) {
  const output = result.output;
  const line = output.split('\n').find((item) => item.endsWith(' - ' + label));
  assert.ok(line, 'missing diagnostic: ' + label);
  return line.startsWith('OK - ');
}

test('readiness accepts valid group JIDs from .env without exposing IDs', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + ',' + jidB + '\n');
  assert.equal(check(result, 'destinos configurados com JIDs de grupo validos'), true);
  assert.equal(result.output.includes(jidA), false);
  assert.equal(result.output.includes(jidB), false);
  assert.equal(result.status, 0, 'diagnostic exit status');
});

test('readiness rejects invalid configured group JIDs even with sending disabled', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=not-a-group\n');
  assert.equal(check(result, 'destinos configurados com JIDs de grupo validos'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('readiness accepts legacy singular destination setting', () => {
  const result = runReadiness('WHATSAPP_GROUP_JID=' + jidA + '\n');
  assert.equal(check(result, 'destinos configurados com JIDs de grupo validos'), true);
  assert.equal(result.status, 0, 'diagnostic exit status');
});

test('readiness requires exact confirmed destination set for enabled sending', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + ',' + jidB + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + '\nAUTORIZAR_ENVIO_PAINEL=sim\n');
  assert.equal(check(result, 'envio autorizado somente para conjunto exato de destinos configurados'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('hosting environment overrides .env values without exposing token', () => {
  const result = runReadiness('PORT=4545\nPAINEL_TOKEN=secret-from-file\n', { PORT: '8888', PAINEL_TOKEN: '' });
  assert.equal(check(result, 'token configurado para acesso remoto'), false);
  assert.equal(result.output.includes('secret-from-file'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('readiness rejects duplicate configured and confirmed destinations', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + ',' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + ',' + jidA + '\n');
  assert.equal(check(result, 'destinos configurados sem duplicatas'), false);
  assert.equal(check(result, 'destinos confirmados sem duplicatas'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('readiness rejects extra confirmations even if all configured destinations are present', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + ',' + jidB + '\nAUTORIZAR_ENVIO_WHATSAPP=sim\n');
  assert.equal(check(result, 'envio autorizado somente para conjunto exato de destinos configurados'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('readiness flags active sending and never prints configured destinations', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + '\nAUTORIZAR_ENVIO_PAINEL=sim\n');
  assert.equal(check(result, 'envio real desabilitado por padrao'), false);
  assert.equal(result.output.includes(jidA), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('readiness rejects missing publication destinations without enabling sending', () => {
  const result = runReadiness('AUTORIZAR_ENVIO_PAINEL=nao\n');
  assert.equal(check(result, 'ao menos um destino configurado para publicacao'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});


test('readiness rejects invalid confirmed group JIDs even when sending is disabled', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=not-a-group\nAUTORIZAR_ENVIO_PAINEL=nao\n');
  assert.equal(check(result, 'destinos confirmados com JIDs de grupo validos'), false);
  assert.equal(result.output.includes('not-a-group'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

test('readiness requires a private token for hosted panel even with sending disabled', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n', {
    PORT: '8080', PAINEL_TOKEN: '', AUTORIZAR_ENVIO_PAINEL: 'nao',
  });
  assert.equal(check(result, 'token configurado para acesso remoto'), false);
  assert.equal(result.status, 1, 'diagnostic exit status');
});

// A configuracao nao deve mascarar a ausencia de componentes reais do motor.
test('readiness fails when the real HTTP server integration is missing', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n', {}, ['src/localServer.js']);
  assert.equal(check(result, 'src/localServer.js'), false);
  assert.equal(check(result, 'servidor importa painel real'), false);
  assert.equal(result.status, 1);
});

test('readiness fails when WhatsApp sender module is missing', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n', {}, ['src/whatsapp/sender.js']);
  assert.equal(check(result, 'src/whatsapp/sender.js'), false);
  assert.equal(result.status, 1);
});

test('readiness fails when the actual panel module is missing', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n', {}, ['src/painel.js']);
  assert.equal(check(result, 'src/painel.js'), false);
  assert.equal(check(result, 'painel possui autenticacao'), false);
  assert.equal(check(result, 'rota do painel /painel/status'), false);
  assert.equal(result.status, 1);
});

test('readiness fails when the WhatsApp connection module is missing', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n', {}, ['src/whatsapp/connection.js']);
  assert.equal(check(result, 'src/whatsapp/connection.js'), false);
  assert.equal(result.status, 1);
});


test('readiness rejects missing entrypoint even when other modules exist', () => {
  const result = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n', {}, ['index.js']);
  assert.equal(check(result, 'index.js'), false);
  assert.equal(check(result, 'index inicia servidor HTTP original'), false);
  assert.equal(result.status, 1);
});

test('readiness rejects enabled sending when no destinations are configured', () => {
  const result = runReadiness('AUTORIZAR_ENVIO_WHATSAPP=sim\nGRUPOS_DESTINO_CONFIRMADOS=' + jidA + '\n');
  assert.equal(check(result, 'ao menos um destino configurado para publicacao'), false);
  assert.equal(check(result, 'envio autorizado somente para conjunto exato de destinos configurados'), false);
  assert.equal(result.output.includes(jidA), false);
  assert.equal(result.status, 1);
});
