import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
// Diagnostico somente leitura: nao conecta WhatsApp nem envia ofertas.
// Execute: node scripts/check-whatsapp-readiness.js
const e = process.env;
if (process.env.NODE_OPTIONS?.includes('--require')) console.warn('NODE_OPTIONS presente: confira extensoes carregadas.');
const split = value => String(value || '').split(',').map(s => s.trim()).filter(Boolean);
const valid = list => list.length > 0 && new Set(list).size === list.length && list.every(jid => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(jid));
const destinations = split(e.WHATSAPP_GROUP_JIDS || e.WHATSAPP_GROUP_JID);
const confirmed = split(e.GRUPOS_DESTINO_CONFIRMADOS);
const mode = (e.DESTINO_POSTAGEM || 'telegram').trim().toLowerCase();
const problems = [];
const warnings = [];
if (!['telegram', 'whatsapp', 'ambos'].includes(mode)) problems.push('DESTINO_POSTAGEM invalido');
if (mode === 'telegram') warnings.push('Destino padrao e Telegram: nao ha publicacao automatica no WhatsApp');
if (['whatsapp', 'ambos'].includes(mode) && !valid(destinations)) problems.push('Grupos WhatsApp ausentes, duplicados ou invalidos');
if (['telegram', 'ambos'].includes(mode) && !(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CANAL)) problems.push('Telegram selecionado sem token/canal');
if (!e.PAINEL_TOKEN) problems.push('PAINEL_TOKEN ausente');
if (!valid(confirmed) || destinations.length !== confirmed.length || !destinations.every(jid => confirmed.includes(jid))) warnings.push('Destinos ainda nao confirmados para envio manual/extensao');
if (e.AUTORIZAR_ENVIO_PAINEL === 'sim' || e.AUTORIZAR_ENVIO_EXTENSAO === 'sim') warnings.push('Autorizacao de envio ativa: confirme grupos antes de iniciar');
if (!e.GRUPOS_ORIGEM && !e.PY_GRUPOS_ORIGEM) warnings.push('Nenhum grupo de origem configurado');
if (e.RENDER || e.RENDER_SERVICE_ID) warnings.push('Verifique disco persistente e processo sempre ativo no Render');
const sources = {
  shopee: Boolean(e.SHOPEE_APP_ID && e.SHOPEE_APP_SECRET),
  mercadolivre: Boolean(e.ML_SAMPLE_AFFILIATE_LINK && e.ML_CLIENT_ID && e.ML_CLIENT_SECRET && e.ML_REFRESH_TOKEN),
  amazon: Boolean(e.AMAZON_CREATORS_CLIENT_ID && e.AMAZON_CREATORS_CLIENT_SECRET && e.AMAZON_ASSOCIATE_TAG)
};
if (!Object.values(sources).some(Boolean)) problems.push('Nenhuma fonte de afiliados configurada');
const destinosConfirmados = valid(destinations) && valid(confirmed) && destinations.length === confirmed.length && destinations.every(jid => confirmed.includes(jid));
const configuracaoProntaParaEnvioWhatsApp = ['whatsapp', 'ambos'].includes(mode) && problems.length === 0 && destinosConfirmados && e.AUTORIZAR_ENVIO_PAINEL === 'sim';
// Diagnostico offline nao pode confirmar socket conectado, sessao persistida ou entrega.
// Manter o campo antigo por compatibilidade, mas expor claramente seu escopo.
const prontoParaEnvioWhatsApp = configuracaoProntaParaEnvioWhatsApp;
const sessaoWhatsAppVerificada = false;
const envioOperacionalVerificado = false;
if (configuracaoProntaParaEnvioWhatsApp) warnings.push('Configuracao pronta, mas sessao WhatsApp e entrega real nao verificadas por este diagnostico offline');
console.log(JSON.stringify({ ok: problems.length === 0, prontoParaEnvioWhatsApp, configuracaoProntaParaEnvioWhatsApp, sessaoWhatsAppVerificada, envioOperacionalVerificado, destinosConfirmados, destino: mode, plataformas: Object.keys(sources).filter(k => sources[k]), totalGruposDestino: destinations.length, problems, warnings }, null, 2));
if (problems.length) process.exitCode = 1;
