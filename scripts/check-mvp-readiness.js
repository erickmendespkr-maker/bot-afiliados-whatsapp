// Diagnostico offline: nao conecta ao WhatsApp nem envia mensagens.
import { readFileSync, existsSync } from 'node:fs';

const files = ['index.js', 'src/localServer.js', 'src/painel.js', 'src/whatsapp/connection.js', 'src/whatsapp/sender.js'];
const checks = files.map((path) => ({ item: path, ok: existsSync(path) }));
const entrypoint = existsSync('index.js') ? readFileSync('index.js', 'utf8') : '';
const localServer = existsSync('src/localServer.js') ? readFileSync('src/localServer.js', 'utf8') : '';
const painel = existsSync('src/painel.js') ? readFileSync('src/painel.js', 'utf8') : '';
checks.push({ item: 'index inicia servidor HTTP original', ok: entrypoint.includes("from './src/localServer.js'") && entrypoint.includes('startLocalServer()') });
checks.push({ item: 'servidor importa painel real', ok: localServer.includes("from './painel.js'") && localServer.includes('tratarRotaDoPainel(req, res') });
checks.push({ item: 'painel conectado ao servidor HTTP', ok: localServer.includes('tratarRotaDoPainel(req, res') });
checks.push({ item: 'servidor delega envio ao motor existente', ok: localServer.includes('sendDealToGroups(') });
checks.push({ item: 'painel possui autenticacao', ok: painel.includes('export function autorizado(req)') });
checks.push({ item: 'painel possui QR Code', ok: painel.includes('getLatestQr') });
checks.push({ item: 'painel possui controle de pausa', ok: painel.includes('definirPausa') });
const hasToken = Boolean(process.env.PAINEL_TOKEN?.trim());
const hosted = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.PAINEL_NA_REDE === 'sim');
checks.push({ item: 'token configurado para acesso remoto', ok: !hosted || hasToken });
checks.push({ item: 'envio real desabilitado por padrao', ok: process.env.AUTORIZAR_ENVIO_EXTENSAO !== 'sim' && process.env.AUTORIZAR_ENVIO_PAINEL !== 'sim' && process.env.AUTORIZAR_ENVIO_WHATSAPP !== 'sim' });
for (const check of checks) console.log((check.ok ? 'OK' : 'PENDENTE') + ' - ' + check.item);
console.log('Diagnostico estatico: nao comprova QR conectado, sessao persistente, credenciais ou publicacao.');
if (checks.some((check) => !check.ok)) process.exitCode = 1;
