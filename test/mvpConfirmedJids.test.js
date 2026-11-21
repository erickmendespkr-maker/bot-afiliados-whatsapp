import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = join(dirname(dirname(fileURLToPath(import.meta.url))), 'scripts/check-mvp-readiness.js');

test('readiness rejects invalid confirmed WhatsApp group IDs without exposing them', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'mvp-confirmed-jids-'));
  const invalid = 'private-invalid-destination';
  try {
    writeFileSync(join(cwd, '.env'), 'GRUPOS_DESTINO_CONFIRMADOS=' + invalid + '\n');
    const env = { ...process.env };
    for (const key of ['PORT', 'RENDER', 'RENDER_SERVICE_ID', 'PAINEL_NA_REDE', 'PAINEL_TUNEL_AUTOMATICO',
      'PAINEL_TOKEN', 'AUTORIZAR_ENVIO_EXTENSAO', 'AUTORIZAR_ENVIO_PAINEL',
      'AUTORIZAR_ENVIO_WHATSAPP', 'WHATSAPP_GROUP_JIDS', 'WHATSAPP_GROUP_JID', 'GRUPOS_DESTINO_CONFIRMADOS']) {
      delete env[key];
    }
    const result = spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /PENDENTE - destinos confirmados com JIDs de grupo validos/);
    assert.equal(result.stdout.includes(invalid), false);
    assert.equal(result.stderr.includes(invalid), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
