import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

// Confere a sintaxe dos scripts embutidos na interface real, sem iniciar
// WhatsApp, acessar a rede ou executar qualquer acao de envio.
test('scripts inline do painel e login possuem JavaScript valido', () => {
  const source = readFileSync(new URL('../src/painel.js', import.meta.url), 'utf8');
  const pages = [
    ['login', source.match(/const PAGINA_SENHA_BASE = `([\s\S]*?)`;\s*export const PAGINA_HTML/), true],
    ['painel', source.match(/export const PAGINA_HTML = `([\s\S]*?<\/html>)`;/), false],
  ];
  for (const [name, match, login] of pages) {
    assert.ok(match, 'HTML da pagina nao encontrado: ' + name);
    const scripts = [...match[1].matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length > 0, 'nenhum script encontrado: ' + name);
    for (const [i, script] of scripts.entries()) {
      const js = login ? script[1].replace('const ERROU = __ERROU__;', 'const ERROU = false;') : script[1];
      assert.doesNotThrow(() => new Script(js, { filename: name + '-inline-' + i + '.js' }));
    }
  }
});
