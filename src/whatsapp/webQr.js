// QR temporario em memoria; nunca persistir ou registrar o conteudo.
let qrAtual = null;
let expiraEm = 0;
export function setLatestQr(qr) {
  qrAtual = qr || null;
  expiraEm = qr ? Date.now() + 60000 : 0;
}
export function getLatestQr() {
  if (!qrAtual || Date.now() > expiraEm) return null;
  return qrAtual;
}
