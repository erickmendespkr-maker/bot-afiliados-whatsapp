import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = (overrides = {}) => {
  const env = { ...process.env, PORT: '', RENDER: '', RENDER_SERVICE_ID: '',
    PAINEL_NA_REDE: '', PAINEL_TUNEL_AUTOMATICO: '',
    AUTORIZAR_ENVIO_EXTENSAO: 'nao', AUTORIZAR_ENVIO_PAINEL: 'nao',
    AUTORIZAR_ENVIO_WHATSAPP: 'nao', GRUPOS_DESTINO_CONFIRMADOS: '',
    ...overrides };
  return spawnSync(process.execPath, ['scripts/check-mvp-readiness.js'], {
    env, encoding: 'utf8', timeout: 10000
  });
};

test('diagnostico nao imprime segredos fornecidos em ambiente', () => {
  const secret = 'SENTINELA_SEGREDO_NAO_LOGAR_987654321';
  const result = run({ PAINEL_TOKEN: secret, SHOPEE_APP_SECRET: secret });
  assert.equal(result.error, undefined);
  assert.doesNotMatch(result.stdout + result.stderr, /SENTINELA_SEGREDO_NAO_LOGAR_987654321/);
});

test('diagnostico bloqueia autorizacao da extensao sem destinos confirmados', () => {
  const result = run({ AUTORIZAR_ENVIO_EXTENSAO: 'sim' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PENDENTE - extensao autorizada somente com destinos confirmados/);
});

test('diagnostico identifica destinos confirmados duplicados', () => {
  const result = run({ GRUPOS_DESTINO_CONFIRMADOS: 'grupo1@g.us,grupo1@g.us' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PENDENTE - destinos confirmados sem duplicatas/);
});

test('diagnostico exige token em hospedagem e nao divulga seu valor', () => {
  const result = run({ PORT: '4545', PAINEL_TOKEN: '' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PENDENTE - token configurado para acesso remoto/);
});


test('diagnostico rejeita destino que nao e JID de grupo', () => {
  const result = run({ GRUPOS_DESTINO_CONFIRMADOS: 'grupo-qualquer', AUTORIZAR_ENVIO_EXTENSAO: 'sim' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PENDENTE - destinos confirmados com JIDs de grupo validos/);
  assert.doesNotMatch(result.stdout + result.stderr, /grupo-qualquer/);
});

test('diagnostico aceita formato de JID de grupo sem expor identificador', () => {
  const jid = '120363123456789012@g.us';
  const result = run({ GRUPOS_DESTINO_CONFIRMADOS: jid });
  assert.doesNotMatch(result.stdout + result.stderr, /120363123456789012/);
  assert.match(result.stdout, /OK - destinos confirmados com JIDs de grupo validos/);
});
