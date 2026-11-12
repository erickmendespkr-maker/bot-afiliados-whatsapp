import { createServer } from 'node:http';

const port = Number(process.env.PORT || 10000);
const host = '0.0.0.0';
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bot de Ofertas — Teste Render</title><style>body{font-family:system-ui;background:#101827;color:#edf2fa;margin:0;padding:36px 18px}main{max-width:680px;margin:auto}section{background:#1b293d;border:1px solid #34445b;border-radius:16px;padding:24px}h1{font-size:1.7rem}p{line-height:1.6}.muted{color:#b9c6d8}.status{color:#8de7b2;font-weight:700}</style></head><body><main><section><h1>Bot de Ofertas — Painel de Teste</h1><p class="status">Servidor Render online</p><p>Esta é uma prévia segura da hospedagem gratuita. O envio de ofertas e a conexão com o WhatsApp estão desativados até configurar as credenciais, os grupos e a sessão.</p><p class="muted">Horário desejado: todos os dias, 09h–22h (Brasília). O Render Free pode suspender o serviço por inatividade e não garante operação contínua.</p></section></main></body></html>`;
createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,mode:'preview',whatsapp:false}));return;}
  if(req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('Não encontrado');
}).listen(port,host,()=>console.log('Render preview escutando na porta '+port));
