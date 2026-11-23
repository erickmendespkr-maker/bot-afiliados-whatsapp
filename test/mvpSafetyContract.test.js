import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Teste offline: nao importa modulos do motor, nao abre socket nem envia mensagens.
// Protege as travas criticas contra remocoes acidentais em futuras alteracoes.
test('rotas de publicacao preservam autorizacao e confirmacao de destinos', () => {
  const server = readFileSync(new URL('../src/localServer.js', import.meta.url), 'utf8');
  const reader = readFileSync(new URL('../src/groupReader.js', import.meta.url), 'utf8');
  assert.match(server, /AUTORIZAR_ENVIO_EXTENSAO/);
  assert.match(server, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(server, /estaPausado\(\)/);
  assert.match(server, /waitForConnection/);
  assert.match(reader, /AUTORIZAR_ENVIO_WHATSAPP/);
  assert.match(reader, /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(reader, /estaPausado\(\)/);
  assert.match(reader, /config\.dryRun/);
});

test('arquivos centrais passam no parser do Node sem carregar dependencias', () => {
  for (const file of ['index.js', 'src/localServer.js', 'src/painel.js', 'src/groupReader.js']) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, file + ': ' + (result.stderr || result.error || 'falha de sintaxe'));
  }
});

test('painel nao confunde autorizacao de destinos com sessao WhatsApp ativa', () => {
  const painel = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
  assert.match(painel, /whatsappOperacional:\s*Boolean\(getSocket\(\)\)\s*&&\s*!estaPausado\(\)\s*&&\s*!config\.dryRun/);
  assert.match(painel, /d\.whatsappOperacional && d\.envioExtensaoAutorizado/);
  assert.match(painel, /envio não testado/);
});
