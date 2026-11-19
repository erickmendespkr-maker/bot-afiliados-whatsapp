# Validação operacional do MVP (sem envios reais)

Este roteiro usa o motor existente (`index.js` + `src/localServer.js`), não o `render-preview.js`.

## Pré-requisitos

- Node.js >=22.5, `npm ci` (se houver lockfile; caso contrário `npm install`).
- Credenciais de afiliados e `PAINEL_TOKEN` em variáveis privadas/`.env`, nunca no Git.
- WhatsApp autenticado pelo QR; confirmar participação nos grupos de origem e destino.
- Sessão WhatsApp em armazenamento persistente, com backup protegido; não versionar arquivos de autenticação.

## Sequência de verificação no Linux

1. Com envios **desabilitados** (`AUTORIZAR_ENVIO_EXTENSAO=nao`, `AUTORIZAR_ENVIO_PAINEL=nao`, `AUTORIZAR_ENVIO_WHATSAPP=nao`), execute `npm test` e `npm run check:mvp`.
2. Execute `npm start`; abra `http://127.0.0.1:4545/painel` (ou a porta configurada), autentique e confirme que status, QR, origens, destinos, pausa e lista respondem. O diagnóstico estático não substitui essa etapa.
3. Sem autorizar publicação, execute a simulação de uma oferta existente pelo painel; confirme `simulacao: true` e `enviado: false`. Verifique que o histórico não muda.
4. Confirme que as rotas de escrita rejeitam clientes sem autenticação, requisições de origem externa e corpos inválidos. Confirme que `/post` rejeita publicação sem destinos confirmados e quando a operação está pausada.
5. Reinicie o processo e verifique se a sessão WhatsApp permanece válida. Registre resultados de forma anonimizada, sem QR, tokens, cookies ou JIDs.

## Critérios para liberar o primeiro envio

Apenas após aprovação dos testes, credenciais válidas, grupos de destino identificados e confirmados pelo operador e **autorização explícita para envio real**. Nunca habilitar flags de envio por conta própria. A simulação não equivale a uma publicação real.

## Hospedagem

Hospedagem gratuita com suspensão automática impede o agendador e a conexão contínua. Disco efêmero pode apagar a sessão do WhatsApp. A interface pública precisa de HTTPS, autenticação e armazenamento persistente; um painel estático na Vercel não executa sozinho o motor WhatsApp. Render deve ser usado somente quando houver serviço persistente e configurações privadas adequadas. Não registrar credenciais nem expor arquivos de sessão/QR em endpoints públicos.

## Evidência mínima de aceite

Registrar versão do commit, versão Node, quantidade de testes aprovados/falhos, códigos HTTP dos testes, estado de QR/conexão, estado de persistência após reinício e confirmação de que **zero mensagens reais** foram enviadas durante os testes sem autorização.
