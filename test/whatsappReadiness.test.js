import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-whatsapp-readiness.js', import.meta.url));

function check(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'ofertas-readiness-'));
  try {
    writeFileSync(join(dir, '.env'), lines.join('\n') + '\n', { mode: 0o600 });
    const result = spawnSync(process.execPath, [script], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 5000,
      env: { PATH: process.env.PATH || '', HOME: dir, NODE_OPTIONS: '' }
    });
    assert.equal(result.error, undefined);
    return { status: result.status, output: JSON.parse(result.stdout) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('diagnostico falha fechado sem credenciais e sem grupos', () => {
  const { status, output } = check([]);
  assert.equal(status, 1);
  assert.equal(output.ok, false);
  assert.equal(output.destino, 'telegram');
  assert.ok(output.problems.includes('PAINEL_TOKEN ausente'));
});

test('diagnostico aceita somente configuracao completa e nao revela segredos', () => {
  const secret = 'SEGREDO_TESTE_NUNCA_EXIBIR_123';
  const { status, output } = check([
    'DESTINO_POSTAGEM=whatsapp',
    'PAINEL_TOKEN=' + secret,
    'SHOPEE_APP_ID=123',
    'SHOPEE_APP_SECRET=' + secret,
    'WHATSAPP_GROUP_JIDS=123456@g.us',
    'GRUPOS_DESTINO_CONFIRMADOS=123456@g.us'
  ]);
  assert.equal(status, 0);
  assert.equal(output.ok, true);
  assert.equal(output.totalGruposDestino, 1);
  assert.ok(!JSON.stringify(output).includes(secret));
});

test('diagnostico rejeita destinos duplicados', () => {
  const { status, output } = check([
    'DESTINO_POSTAGEM=whatsapp',
    'PAINEL_TOKEN=teste',
    'SHOPEE_APP_ID=123',
    'SHOPEE_APP_SECRET=teste',
    'WHATSAPP_GROUP_JIDS=123456@g.us,123456@g.us'
  ]);
  assert.equal(status, 1);
  assert.ok(output.problems.some(p => p.includes('duplicados')));
});
