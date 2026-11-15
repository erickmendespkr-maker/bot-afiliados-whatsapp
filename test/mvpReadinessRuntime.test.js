import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-mvp-readiness.js', import.meta.url));
const cwd = fileURLToPath(new URL('..', import.meta.url));

function run(overrides = {}) {
  const env = { ...process.env };
  for (const name of ['RENDER', 'RENDER_SERVICE_ID', 'PAINEL_NA_REDE', 'PAINEL_TOKEN', 'AUTORIZAR_ENVIO_EXTENSAO', 'AUTORIZAR_ENVIO_PAINEL', 'AUTORIZAR_ENVIO_WHATSAPP']) delete env[name];
  Object.assign(env, overrides);
  return spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8', timeout: 10000 });
}

test('diagnostico offline verifica componentes sem exigir credenciais locais', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /OK - painel conectado ao servidor HTTP/);
  assert.match(result.stdout, /OK - servidor delega envio ao motor existente/);
  assert.match(result.stdout, /nao comprova QR conectado/);
});

test('diagnostico bloqueia exposicao remota sem token e nao imprime segredos', () => {
  const secret = 'NAO_IMPRIMIR_TOKEN_DE_TESTE_987';
  const result = run({ RENDER: 'true', PAINEL_TOKEN: '' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PENDENTE - token configurado para acesso remoto/);
  const withToken = run({ RENDER: 'true', PAINEL_TOKEN: secret });
  assert.equal(withToken.status, 0, withToken.stderr + withToken.stdout);
  assert.doesNotMatch(withToken.stdout + withToken.stderr, new RegExp(secret));
});

test('diagnostico sinaliza qualquer permissao de envio real habilitada', () => {
  for (const flag of ['AUTORIZAR_ENVIO_EXTENSAO', 'AUTORIZAR_ENVIO_PAINEL', 'AUTORIZAR_ENVIO_WHATSAPP']) {
    const result = run({ [flag]: 'sim' });
    assert.equal(result.status, 1, flag);
    assert.match(result.stdout, /PENDENTE - envio real desabilitado por padrao/);
  }
});
