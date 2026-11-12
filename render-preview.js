import { createServer } from 'node:http';
import { PAGINA_HTML } from './src/painel.js';

const port = Number(process.env.PORT || 10000);
createServer((req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, mode: 'original-panel-preview', whatsapp: false }));
    return;
  }
  if (req.method === 'GET' && (path === '/' || path === '/painel')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(PAGINA_HTML);
    return;
  }
  if (req.method === 'GET' && path === '/painel/lista') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, promocoes: [], modoTeste: true }));
    return;
  }
  if (path.startsWith('/painel/') || path === '/post') {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: false, error: 'Modo de visualizacao: WhatsApp e envios desativados.' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Não encontrado');
}).listen(port, '0.0.0.0', () => console.log('Painel original em modo visualizacao, porta ' + port));
