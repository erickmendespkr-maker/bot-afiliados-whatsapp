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
// Verificacoes adicionais de integracao: apenas inspecao, sem WhatsApp nem envios.
const rotasEssenciais = [
  ['/painel/status', "url === '/painel/status'"],
  ['/painel/grupos', "url === '/painel/grupos'"],
  ['/painel/origens', "url === '/painel/origens'"],
  ['/painel/destinos', "url === '/painel/destinos'"],
  ['/painel/qr', "url === '/painel/qr'"],
  ['/painel/afiliados', "url === '/painel/afiliados'"],
  ['/painel/operacao', "url === '/painel/operacao'"],
  ['/painel/simular-oferta', "url === '/painel/simular-oferta'"],
  ['/painel/lista', "url === '/painel/lista'"],
];
for (const [rota, assinatura] of rotasEssenciais) {
  checks.push({ item: 'rota do painel ' + rota, ok: painel.includes(assinatura) });
}
checks.push({ item: 'login gera cookie HttpOnly', ok: painel.includes('painel_session=') && painel.includes('HttpOnly') });
checks.push({ item: 'escritas com cookie exigem Origin', ok: painel.includes('cookiePermitido') && painel.includes('origemSegura') });
checks.push({ item: 'troca de destinos revoga envio', ok: painel.includes("AUTORIZAR_ENVIO_PAINEL: 'nao'") && painel.includes("AUTORIZAR_ENVIO_WHATSAPP: 'nao'") });
checks.push({ item: 'simulacao consulta sem envio', ok: painel.includes("url === '/painel/simular-oferta'") && painel.includes('simulacao: true, enviado: false') });
const hasToken = Boolean(process.env.PAINEL_TOKEN?.trim());
// PORT tambem identifica hospedagens como Railway; nao declarar acesso remoto pronto sem token.
const hosted = Boolean(process.env.PORT || process.env.RENDER || process.env.RENDER_SERVICE_ID || ['sim', 'true', '1'].includes(String(process.env.PAINEL_NA_REDE || '').toLowerCase()) || ['sim', 'true', '1'].includes(String(process.env.PAINEL_TUNEL_AUTOMATICO || '').toLowerCase()));
checks.push({ item: 'token configurado para acesso remoto', ok: !hosted || hasToken });
checks.push({ item: 'envio real desabilitado por padrao', ok: process.env.AUTORIZAR_ENVIO_EXTENSAO !== 'sim' && process.env.AUTORIZAR_ENVIO_PAINEL !== 'sim' && process.env.AUTORIZAR_ENVIO_WHATSAPP !== 'sim' });
// Validacao de configuracao sem imprimir tokens, JIDs ou credenciais.
const destinosConfirmados = (process.env.GRUPOS_DESTINO_CONFIRMADOS || '').split(',').map((jid) => jid.trim()).filter(Boolean);
const envioExtensaoAtivo = process.env.AUTORIZAR_ENVIO_EXTENSAO === 'sim';
const envioPainelAtivo = process.env.AUTORIZAR_ENVIO_PAINEL === 'sim';
const envioWhatsappAtivo = process.env.AUTORIZAR_ENVIO_WHATSAPP === 'sim';
checks.push({ item: 'extensao autorizada somente com destinos confirmados', ok: !envioExtensaoAtivo || destinosConfirmados.length > 0 });
checks.push({ item: 'painel autorizado somente com destinos confirmados', ok: !envioPainelAtivo || destinosConfirmados.length > 0 });
checks.push({ item: 'whatsapp autorizado somente com destinos confirmados', ok: !envioWhatsappAtivo || destinosConfirmados.length > 0 });
checks.push({ item: 'destinos confirmados sem duplicatas', ok: new Set(destinosConfirmados).size === destinosConfirmados.length });
// Os destinos confirmados precisam corresponder exatamente aos configurados quando o envio estiver habilitado.
// Isso evita um diagnostico verde com confirmacoes antigas ou grupos extras.
const destinosConfigurados = (process.env.WHATSAPP_GROUP_JIDS || process.env.WHATSAPP_GROUP_JID || '').split(',').map((jid) => jid.trim()).filter(Boolean);
const algumEnvioAtivo = envioExtensaoAtivo || envioPainelAtivo || envioWhatsappAtivo;
const mesmosDestinos = destinosConfigurados.length > 0 &&
  destinosConfigurados.length === destinosConfirmados.length &&
  destinosConfigurados.every((jid) => destinosConfirmados.includes(jid));
checks.push({ item: 'envio autorizado somente para conjunto exato de destinos configurados', ok: !algumEnvioAtivo || mesmosDestinos });
checks.push({ item: 'destinos configurados sem duplicatas', ok: new Set(destinosConfigurados).size === destinosConfigurados.length });
// Validar tambem os destinos configurados, mesmo com envios desligados: evita diagnostico verde para JIDs invalidos.
checks.push({ item: 'destinos configurados com JIDs de grupo validos', ok: destinosConfigurados.every((jid) => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(jid)) });
// Um texto arbitrario nao comprova um grupo WhatsApp. Nunca imprimir os JIDs no diagnostico.
checks.push({ item: 'destinos confirmados com JIDs de grupo validos', ok: destinosConfirmados.every((jid) => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(jid)) });
if (hosted) {
  console.log('AVISO - Hospedagem: validar armazenamento persistente da sessao WhatsApp e processo sempre ativo; PORT/RENDER nao garantem isso.');
  console.log('AVISO - Credenciais: conferir PAINEL_TOKEN e afiliados por variaveis privadas; nunca registrar valores nos logs.');
}
for (const check of checks) console.log((check.ok ? 'OK' : 'PENDENTE') + ' - ' + check.item);
console.log('Diagnostico estatico: nao comprova QR conectado, sessao persistente, credenciais ou publicacao.');
if (checks.some((check) => !check.ok)) process.exitCode = 1;
