import { waitForConnection } from './connection.js';
import { logger } from '../logger.js';
import { estaPausado } from '../operationControl.js';

export async function sendDealMessage(groupJid, { text, imageUrl }) {
  // Ultima barreira compartilhada por agendador, leitor de grupos e painel.
  // Nunca confiar somente na autorizacao da rota HTTP: processos internos
  // tambem chamam este sender. Exigir opt-in e JID explicitamente confirmado.
  if (estaPausado()) {
    logger.warn('Envio WhatsApp bloqueado: operacao pausada.');
    return false;
  }
  const confirmados = new Set((process.env.GRUPOS_DESTINO_CONFIRMADOS || '')
    .split(',').map((jid) => jid.trim()).filter(Boolean));
  if (process.env.AUTORIZAR_ENVIO_WHATSAPP !== 'sim' ||
      !/^\d+@g\.us$/.test(String(groupJid)) ||
      !confirmados.has(groupJid)) {
    logger.warn('Envio WhatsApp bloqueado: autorizacao global ou grupo confirmado ausente.');
    return false;
  }
  const sock = await waitForConnection();

  // A espera pela conexao pode durar minutos. Revalidar imediatamente antes
  // do envio para respeitar uma pausa ou revogacao feita nesse intervalo.
  const confirmadosAgora = new Set((process.env.GRUPOS_DESTINO_CONFIRMADOS || '')
    .split(',').map((jid) => jid.trim()).filter(Boolean));
  if (estaPausado() ||
      process.env.AUTORIZAR_ENVIO_WHATSAPP !== 'sim' ||
      !confirmadosAgora.has(groupJid)) {
    logger.warn('Envio WhatsApp cancelado: pausa ou autorizacao alterada durante a espera.');
    return false;
  }

  const payload = imageUrl
    ? { image: { url: imageUrl }, caption: text }
    : { text };

  try {
    await sock.sendMessage(groupJid, payload);
    return true;
  } catch (err) {
    logger.error(`Falha ao enviar mensagem pro WhatsApp: ${err.message}`);
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Manda a mesma oferta pra todos os grupos configurados, com uma pequena
// pausa entre cada envio. Retorna true se pelo menos um grupo recebeu.
export async function sendDealToGroups(groupJids, { text, imageUrl }) {
  let anyOk = false;
  for (const groupJid of groupJids) {
    const ok = await sendDealMessage(groupJid, { text, imageUrl });
    if (ok) anyOk = true;
    if (groupJids.length > 1) await sleep(2000);
  }
  return anyOk;
}
