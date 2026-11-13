// Estado operacional do processo. Reinicios voltam ao estado pausado por seguranca.
// Nao altera as credenciais nem habilita publicacao.
let pausado = true;
export function estaPausado() { return pausado; }
export function definirPausa(valor) {
  if (typeof valor !== 'boolean') throw new TypeError('pausado deve ser booleano');
  pausado = valor;
  return pausado;
}
