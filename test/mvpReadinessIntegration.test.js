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

function runReadiness(envFile, overrides = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'mvp-readiness-'));
  try {
    for (const file of ['index.js', 'src/localServer.js', 'src/painel.js', 'src/whatsapp/connection.js', 'src/whatsapp/sender.js']) {
      mkdirSync(dirname(join(cwd, file)), { recursive: true });
      writeFileSync(join(cwd, file), '');
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
    return result.stdout;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function check(output, label) {
  const line = output.split('\n').find((item) => item.endsWith(' - ' + label));
  assert.ok(line, 'missing diagnostic: ' + label);
  return line.startsWith('OK - ');
}

test('readiness accepts valid group JIDs from .env without exposing IDs', () => {
  const output = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + ',' + jidB + '\n');
  assert.equal(check(output, 'destinos configurados com JIDs de grupo validos'), true);
  assert.equal(output.includes(jidA), false);
  assert.equal(output.includes(jidB), false);
});

test('readiness rejects invalid configured group JIDs even with sending disabled', () => {
  const output = runReadiness('WHATSAPP_GROUP_JIDS=not-a-group\n');
  assert.equal(check(output, 'destinos configurados com JIDs de grupo validos'), false);
});

test('readiness accepts legacy singular destination setting', () => {
  const output = runReadiness('WHATSAPP_GROUP_JID=' + jidA + '\n');
  assert.equal(check(output, 'destinos configurados com JIDs de grupo validos'), true);
});

test('readiness requires exact confirmed destination set for enabled sending', () => {
  const output = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + ',' + jidB + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + '\nAUTORIZAR_ENVIO_PAINEL=sim\n');
  assert.equal(check(output, 'envio autorizado somente para conjunto exato de destinos configurados'), false);
});

test('hosting environment overrides .env values without exposing token', () => {
  const output = runReadiness('PORT=4545\nPAINEL_TOKEN=secret-from-file\n', { PORT: '8888', PAINEL_TOKEN: '' });
  assert.equal(check(output, 'token configurado para acesso remoto'), false);
  assert.equal(output.includes('secret-from-file'), false);
});

test('readiness rejects duplicate configured and confirmed destinations', () => {
  const output = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + ',' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + ',' + jidA + '\n');
  assert.equal(check(output, 'destinos configurados sem duplicatas'), false);
  assert.equal(check(output, 'destinos confirmados sem duplicatas'), false);
});

test('readiness rejects extra confirmations even if all configured destinations are present', () => {
  const output = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + ',' + jidB + '\nAUTORIZAR_ENVIO_WHATSAPP=sim\n');
  assert.equal(check(output, 'envio autorizado somente para conjunto exato de destinos configurados'), false);
});

test('readiness flags active sending and never prints configured destinations', () => {
  const output = runReadiness('WHATSAPP_GROUP_JIDS=' + jidA + '\n' +
    'GRUPOS_DESTINO_CONFIRMADOS=' + jidA + '\nAUTORIZAR_ENVIO_PAINEL=sim\n');
  assert.equal(check(output, 'envio real desabilitado por padrao'), false);
  assert.equal(output.includes(jidA), false);
});
