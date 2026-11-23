import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { Tunnel } from 'cloudflared';
import { config } from './config.js';
import { estaPausado } from './operationControl.js';
import { logger, describeError } from './logger.js';
import { waitForConnection } from './whatsapp/connection.js';
import { sendDealToGroups } from './whatsapp/sender.js';
import { extractAffiliateParams, buildAffiliateLink as buildMlLink } from './mercadolivreLink.js';
import { buildAffiliateLink as buildAmazonLink } from './amazonLink.js';
import { tratarRotaDoPainel, autorizado } from './painel.js';

function buildAffiliateLink(source, productUrl) {
  if (source === 'mercadolivre') {
    const params = extractAffiliateParams(config.mercadolivre.sampleAffiliateLink);
    if (!params) throw new Error('ML_SAMPLE_AFFILIATE_LINK nao configurado ou invalido no .env');
    return buildMlLink(productUrl, params);
  }
  if (source === 'amazon') {
    if (!config.amazon.associateTag) throw new Error('AMAZON_ASSOCIATE_TAG nao configurado no .env');
    return buildAmazonLink(productUrl, config.amazon.associateTag);
  }
  throw new Error(`fonte desconhecida: ${source}`);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const limite = 1_000_000;
    let tamanho = 0;
    const partes = [];
    let encerrado = false;
    req.on('data', (chunk) => {
      if (encerrado) return;
      tamanho += chunk.length;
      if (tamanho > limite) {
        encerrado = true;
        reject(Object.assign(new Error('JSON excede o limite de 1 MB'), { statusCode: 413 }));
        // Nao destruir o socket: o handler consegue devolver HTTP 413.
        req.resume();
        return;
      }
      partes.push(chunk);
    });
    req.on('end', () => {
      if (encerrado) return;
      try {
        resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('JSON invalido'), { statusCode: 400 }));
      }
    });
    req.on('aborted', () => {
      if (encerrado) return;
      encerrado = true;
      reject(Object.assign(new Error('Requisicao interrompida'), { statusCode: 400 }));
    });
    req.on('error', (err) => {
      if (encerrado) return;
      encerrado = true;
      reject(err);
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

async function handlePost(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (err) {
    sendJson(res, err.statusCode || 400, { ok: false, error: err.message });
    return;
  }

  // JSON valido tambem pode ser null, array ou numero. Nesses casos,
  // desestruturar o corpo lancaria TypeError em uma rota async sem await,
  // criando uma rejeicao nao tratada e potencialmente derrubando o servidor.
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    sendJson(res, 400, { ok: false, error: 'O corpo deve ser um objeto JSON.' });
    return;
  }

  const { source, productUrl, title, price, originalPrice, imageUrl, coupon } = payload;

  if (!source || !productUrl || !title || !price) {
    sendJson(res, 400, { ok: false, error: 'Campos obrigatorios: source, productUrl, title, price' });
    return;
  }

  // Rejeitar valores nao textuais antes de construir links e mensagens.
  // Objetos/arrays JSON truthy passavam na checagem acima e podiam chegar
  // aos conversores do motor com tipos inesperados.
  const camposTexto = [source, productUrl, title, price];
  if (!camposTexto.every((valor) => typeof valor === 'string' && valor.trim().length > 0) ||
      !['mercadolivre', 'amazon'].includes(source) ||
      productUrl.length > 4096 || title.length > 500 || price.length > 100 ||
      [originalPrice, imageUrl, coupon].some((valor) =>
        valor !== undefined && (typeof valor !== 'string' || valor.length > 4096))) {
    sendJson(res, 400, { ok: false, error: 'Campos da oferta invalidos.' });
    return;
  }

  // A extensao e um ponto de entrada HTTP: nao aceitar esquemas executaveis,
  // URLs com credenciais embutidas ou enderecos sem hostname antes do conversor.
  // O motor de afiliados permanece intacto.
  let urlProduto;
  try {
    urlProduto = new URL(productUrl);
  } catch {
    sendJson(res, 400, { ok: false, error: 'URL do produto invalida.' });
    return;
  }
  if (!['http:', 'https:'].includes(urlProduto.protocol) ||
      !urlProduto.hostname || urlProduto.username || urlProduto.password) {
    sendJson(res, 400, { ok: false, error: 'URL do produto deve ser HTTP(S), sem credenciais.' });
    return;
  }

  let affiliateLink;
  try {
    affiliateLink = buildAffiliateLink(source, productUrl);
  } catch (err) {
    logger.error(`Extensao: falha ao montar link - ${err.message}`);
    sendJson(res, 400, { ok: false, error: 'Nao foi possivel gerar o link de afiliado. Confira a configuracao da plataforma.' });
    return;
  }

  // Sem encurtador generico (ulvis.net) - o link vai com o dominio real
  // (amazon.com.br / mercadolivre.com.br / shopee) visivel, que passa mais
  // confianca pra quem clica.

  const priceLine = originalPrice
    ? `De: R$ ${originalPrice} | Por: R$ ${price} 🥷`
    : `R$ ${price} 🥷`;
  const couponLine = coupon ? `⚠️ cupom: ${coupon}\n` : '';
  const message =
    `${title}\n\n` +
    `${priceLine}\n` +
    `${couponLine}\n` +
    `Link: ${affiliateLink}`;

  if (config.whatsapp.groupJids.length === 0) {
    sendJson(res, 400, { ok: false, error: 'Nenhum grupo do WhatsApp configurado no .env' });
    return;
  }

  // Validacao em tempo de execucao: o diagnostico offline pode nao ter sido executado.
  // Exigir JIDs de grupos sem duplicatas antes de permitir publicacao.
  const destinosValidos = (jids) =>
    jids.length > 0 &&
    new Set(jids).size === jids.length &&
    jids.every((jid) => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(jid));

  // Publicacao pela extensao exige habilitacao explicita e confirmacao dos JIDs.
  // O token do painel autentica o operador, mas nao autoriza disparos por si so.
  const confirmados = (process.env.GRUPOS_DESTINO_CONFIRMADOS || '')
    .split(',').map((jid) => jid.trim()).filter(Boolean);
  if (config.dryRun || process.env.AUTORIZAR_ENVIO_EXTENSAO !== 'sim' ||
      !destinosValidos(confirmados) || !destinosValidos(config.whatsapp.groupJids) ||
      confirmados.length !== config.whatsapp.groupJids.length ||
      !config.whatsapp.groupJids.every((jid) => confirmados.includes(jid))) {
    sendJson(res, 403, {
      ok: false,
      error: 'Envio bloqueado: configure AUTORIZAR_ENVIO_EXTENSAO=sim e GRUPOS_DESTINO_CONFIRMADOS com todos os destinos autorizados.'
    });
    return;
  }

  // Falhar imediatamente se o operador pausou: nao aguardar indefinidamente
  // a conexao WhatsApp para informar que a publicacao esta bloqueada.
  if (estaPausado()) {
    sendJson(res, 409, { ok: false, error: 'Operacao pausada: envio pela extensao bloqueado.' });
    return;
  }

  try {
    await waitForConnection(30000);
    // A operacao pode ter sido pausada enquanto a conexao era aguardada.
    if (estaPausado()) {
      sendJson(res, 409, { ok: false, error: 'Operacao pausada: envio pela extensao bloqueado.' });
      return;
    }
    // A autorizacao e os destinos podem mudar enquanto esperamos a conexao.
    // Revalidar imediatamente antes de delegar ao motor de envio original.
    const destinosConfirmadosAgora = (process.env.GRUPOS_DESTINO_CONFIRMADOS || '')
      .split(',').map((jid) => jid.trim()).filter(Boolean);
    if (config.dryRun || process.env.AUTORIZAR_ENVIO_EXTENSAO !== 'sim' ||
        !destinosValidos(destinosConfirmadosAgora) || !destinosValidos(config.whatsapp.groupJids) ||
        destinosConfirmadosAgora.length !== config.whatsapp.groupJids.length ||
        !config.whatsapp.groupJids.every((jid) => destinosConfirmadosAgora.includes(jid))) {
      sendJson(res, 403, { ok: false, error: 'Autorizacao de envio ou confirmacao dos destinos revogada.' });
      return;
    }
    const ok = await sendDealToGroups(config.whatsapp.groupJids, { text: message, imageUrl: imageUrl || undefined });
    if (ok) {
      logger.info(`Extensao: postado "${title}" (${source})`);
      sendJson(res, 200, { ok: true });
    } else {
      sendJson(res, 500, { ok: false, error: 'Falha ao enviar pro WhatsApp' });
    }
  } catch (err) {
    if (err.code === 'WHATSAPP_CONNECTION_TIMEOUT') {
      sendJson(res, 503, { ok: false, error: 'WhatsApp desconectado. Tente novamente apos conectar pelo QR Code.' });
      return;
    }
    logger.error(`Extensao: erro ao enviar - ${describeError(err)}`);
    // Nao retornar detalhes internos do provedor/WhatsApp ao cliente HTTP.
    // O diagnostico completo permanece apenas no log do servidor.
    sendJson(res, 500, { ok: false, error: 'Falha interna ao processar a oferta. Consulte o log do servidor.' });
  }
}

// Descobre o IP do PC na rede local (o que o celular precisa usar).
function ipsDaRede() {
  const ips = [];
  for (const lista of Object.values(networkInterfaces())) {
    for (const iface of lista || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

let tunelAtivo = null;

// Chamada ao encerrar o bot (Ctrl+C) - evita deixar um cloudflared.exe
// zumbi rodando sozinho depois que a janela fecha.
export function pararTunel() {
  try {
    tunelAtivo?.stop();
  } catch {
    // se ja tiver morrido sozinho, tanto faz
  }
}

// Sobe o mesmo tunel que antes precisava de "npm run tunel" numa segunda
// janela - agora dentro do proprio processo do bot, uma janela so. Nao trava
// nada se falhar (sem internet pro Cloudflare, por exemplo): so avisa no log
// e o painel continua funcionando normal no PC/Wi-Fi de casa.
function iniciarTunelAutomatico(port) {
  logger.info('Painel: abrindo tunel do Cloudflare (acesso fora de casa)...');
  try {
    tunelAtivo = Tunnel.quick(`http://127.0.0.1:${port}`);
  } catch (err) {
    logger.warn(`Painel: nao consegui iniciar o tunel automatico (${describeError(err)}) - use o painel so no Wi-Fi de casa, ou rode "npm run tunel" manualmente.`);
    return;
  }

  tunelAtivo.once('url', (url) => {
    logger.info(`PAINEL FORA DE CASA (dados moveis): ${url}/painel (informe o token na tela de login)`);
  });
  tunelAtivo.on('error', (err) => {
    logger.warn(`Painel: erro no tunel automatico (${describeError(err)}) - o painel local/rede continua funcionando normal.`);
  });
  tunelAtivo.on('exit', (code) => {
    if (code && code !== 0) {
      logger.warn(`Painel: o tunel automatico caiu (codigo ${code}) - o painel local/rede continua funcionando normal. Reinicie o bot pra tentar de novo.`);
    }
    tunelAtivo = null;
  });
}

export function startLocalServer() {
  const port = config.painel.porta;

  const server = createServer((req, res) => {
    // Nunca permitir vazamento de dados privados do painel por Referer,
    // cache ou incorporacao em paginas de terceiros (clickjacking).
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      // A extensão local pode enviar requisições, mas nunca liberamos CORS global na nuvem.
      res.writeHead(204, { 'Allow': 'GET, POST, OPTIONS' });
      res.end();
      return;
    }

    // URLs malformadas nao podem lancar excecao dentro do callback HTTP.
    // Node nao captura automaticamente erros sincronos desse callback.
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      sendJson(res, 400, { ok: false, error: 'URL da requisicao invalida.' });
      return;
    }

    if (req.method === 'POST' && pathname === '/post') {
      if (!config.painel.token || req.headers['x-painel-token'] !== config.painel.token || !autorizado(req)) {
        sendJson(res, 401, { ok: false, error: 'Token do painel obrigatório para publicar ofertas.' });
        return;
      }
      // A extensao e clientes locais podem omitir Origin, mas uma pagina
      // de outra origem nao pode acionar publicacoes pelo navegador.
      if (req.headers.origin) {
        let mesmaOrigem = false;
        try {
          const origem = new URL(req.headers.origin);
          // Em proxy HTTPS, nao aceitar Origin HTTP mesmo com Host identico.
          // Nao confiar em X-Forwarded-Host para substituir Host.
          const proxyHttps = (req.headers['x-forwarded-proto'] || '')
            .split(',')[0].trim().toLowerCase() === 'https';
          mesmaOrigem = (origem.protocol === 'http:' || origem.protocol === 'https:') &&
            !origem.username && !origem.password &&
            origem.pathname === '/' && !origem.search && !origem.hash &&
            (!proxyHttps || origem.protocol === 'https:') &&
            origem.host === req.headers.host;
        } catch { /* Origin invalido: bloquear. */ }
        if (!mesmaOrigem) {
          sendJson(res, 403, { ok: false, error: 'Origem nao autorizada' });
          return;
        }
      }
      // Capturar rejeicoes inesperadas do handler async: o callback do
      // createServer nao aguarda Promises e uma rejeicao escaparia sem tratamento.
      void handlePost(req, res).catch((err) => {
        logger.error(`Extensao: falha inesperada na rota /post - ${describeError(err)}`);
        if (!res.headersSent && !res.destroyed) {
          sendJson(res, 500, { ok: false, error: 'Falha interna ao processar a oferta.' });
        } else if (!res.writableEnded) {
          res.end();
        }
      });
      return;
    }

    // Painel local das promocoes prontas (/painel e rotas filhas).
    if (tratarRotaDoPainel(req, res, sendJson, readJsonBody)) return;

    sendJson(res, 404, { ok: false, error: 'nao encontrado' });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(
        `Servidor da extensao: porta ${port} ja esta em uso (outro "npm start" rodando?). ` +
          'A extensao do navegador nao vai funcionar ate isso ser resolvido, mas o resto do bot continua normal.'
      );
    } else {
      logger.error(`Servidor da extensao: erro inesperado - ${err.message}`);
    }
  });

  // Por padrao so aceita conexoes do proprio PC. Com PAINEL_NA_REDE=sim,
  // aceita tambem os aparelhos da mesma rede (pra abrir o painel no celular).
  // Render exige escuta em 0.0.0.0 para encaminhar requisicoes ao container.
  // A autenticacao continua obrigatoria para acessos nao locais.
  // PORT e definido por diversos provedores (ex.: Railway), nao apenas pelo Render.
  // Sem escutar em 0.0.0.0, o proxy externo nao consegue acessar o painel.
  const hospedado = Boolean(process.env.PORT || process.env.RENDER || process.env.RENDER_SERVICE_ID);
  const endereco = (config.painel.naRede || hospedado) ? '0.0.0.0' : '127.0.0.1';

  server.listen(port, endereco, () => {
    logger.info(`Servidor da extensao ativo em http://127.0.0.1:${port}`);
    logger.info(`PAINEL DAS PROMOCOES (neste PC): http://127.0.0.1:${port}/painel`);

    if (config.painel.naRede) {
      if (!config.painel.token) {
        logger.error(
          'PAINEL_NA_REDE=sim mas PAINEL_TOKEN esta vazio no .env - o painel na rede fica BLOQUEADO ' +
            'por seguranca (qualquer aparelho do Wi-Fi poderia postar no seu grupo). Preencha PAINEL_TOKEN.'
        );
      }
      for (const ip of ipsDaRede()) {
        logger.info(`PAINEL NO CELULAR (mesmo Wi-Fi): http://${ip}:${port}/painel`);
      }

      if (config.painel.tunelAutomatico) {
        if (!config.painel.token) {
          logger.warn(
            'PAINEL_TUNEL_AUTOMATICO=sim mas PAINEL_TOKEN esta vazio - nao vou abrir o tunel publico ' +
              'sem senha configurada (ficaria aberto pra qualquer um). Preencha PAINEL_TOKEN no .env.'
          );
        } else {
          iniciarTunelAutomatico(port);
        }
      }
    }
  });

  return server;
}
