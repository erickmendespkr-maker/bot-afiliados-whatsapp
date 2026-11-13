import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 20000 + Math.floor(Math.random() * 20000);
const base = 'http://127.0.0.1:' + port;
let child;

async function ready() {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('Servidor encerrou antes de iniciar');
    try { const r = await fetch(base + '/health'); if (r.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Servidor não iniciou em 8 segundos');
}

test('painel de teste: rotas públicas de leitura e escrita bloqueada', async t => {
  child = spawn(process.execPath, ['render-preview.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 1500))]);
    }
  });
  await ready();
  const health = await fetch(base + '/health');
  const status = await health.json();
  assert.equal(status.ok, true);
  assert.equal(status.whatsapp, false);
  assert.equal(status.writesEnabled, false);
  assert.equal(status.mode, 'admin-preview');

  for (const route of ['/', '/painel', '/admin']) {
    const r = await fetch(base + route);
    assert.equal(r.status, 200, route);
    assert.match(await r.text(), /Central de Ofertas/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }

  const original = await fetch(base + '/original');
  assert.equal(original.status, 200);
  assert.match(await original.text(), /html/i);

  const session = await fetch(base + '/api/admin/session');
  assert.equal(session.status, 401);
  assert.equal((await session.json()).writesEnabled, false);
  const configDenied = await fetch(base + '/api/admin/config');
  assert.equal(configDenied.status, 401);
  const configWrite = await fetch(base + '/api/admin/config', { method: 'POST' });
  assert.equal(configWrite.status, 405);
  const sessionWrite = await fetch(base + '/api/admin/session', { method: 'POST' });
  assert.equal(sessionWrite.status, 405);
  const lista = await fetch(base + '/painel/lista');
  assert.equal(lista.status, 200);
  assert.deepEqual((await lista.json()).promocoes, []);

  for (const route of ['/post', '/api/config', '/painel/salvar']) {
    const r = await fetch(base + route, { method: 'POST' });
    assert.equal(r.status, 503, route);
    assert.equal((await r.json()).ok, false);
  }
  const missing = await fetch(base + '/nao-existe');
  assert.equal(missing.status, 404);
});
