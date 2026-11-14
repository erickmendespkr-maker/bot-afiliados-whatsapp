import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Verificacoes estaticas de integracao: nao enviam mensagens nem requerem credenciais.
// Nao substituem os testes HTTP e WhatsApp ponta a ponta.
const ler = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('index.js inicia o servidor real antes de aguardar o QR WhatsApp', () => {
  const codigo = ler('index.js');
  assert.match(codigo, /import\s*\{[^}]*startLocalServer[^}]*\}\s*from\s*['"]\.\/src\/localServer\.js['"]/);
  assert.ok(codigo.indexOf('startLocalServer();') < codigo.indexOf('await connectWhatsApp('));
  assert.doesNotMatch(codigo, /render-preview\.js/);
});

test('rota de publicacao da extensao autentica e valida origem', () => {
  const codigo = ler('src/localServer.js');
  const inicio = codigo.indexOf("pathname === '/post'");
  assert.ok(inicio >= 0, 'rota /post ausente');
  const trecho = codigo.slice(inicio, codigo.indexOf('handlePost(req, res);', inicio));
  assert.match(trecho, /autorizado\(req\)/);
  assert.match(trecho, /req\.headers\.origin/);
  assert.match(trecho, /mesmaOrigem/);
});

test('sender exige opt-in, JID confirmado e revalida apos conexao', () => {
  const codigo = ler('src/whatsapp/sender.js');
  const inicio = codigo.indexOf('export async function sendDealMessage(');
  const fim = codigo.indexOf('function sleep(', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const trecho = codigo.slice(inicio, fim);
  const espera = trecho.indexOf('await waitForConnection()');
  const envio = trecho.indexOf('sock.sendMessage(');
  assert.ok(espera > 0 && envio > espera);
  assert.match(trecho.slice(0, espera), /AUTORIZAR_ENVIO_WHATSAPP/);
  assert.match(trecho.slice(0, espera), /GRUPOS_DESTINO_CONFIRMADOS/);
  assert.match(trecho.slice(espera, envio), /estaPausado\(\)/);
  assert.match(trecho.slice(espera, envio), /AUTORIZAR_ENVIO_WHATSAPP/);
  assert.match(trecho.slice(espera, envio), /confirmadosAgora\.has\(groupJid\)/);
});
