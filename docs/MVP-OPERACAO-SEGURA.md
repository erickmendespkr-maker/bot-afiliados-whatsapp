# MVP — operação segura do painel e motor original

Este documento descreve critérios de aceite. **Não autoriza envios reais.**

## Arquitetura obrigatória
- Executar `node index.js` (ou `npm start`), que inicia `src/localServer.js`.
- A interface em `/painel` é atendida por `src/painel.js`; `render-preview.js` não é o serviço de produção.
- Manter coleta, conversão, agendamento, leitura de grupos e envio originais. A rota `/post` delega a `sendDealToGroups`.
- No primeiro acesso, iniciar em modo de teste com `PAINEL_NO_DRY_RUN=sim` e `npm run dry-run`. Não confundir simulação de oferta com publicação real.

## Verificações sem disparos
1. `node --version`: usar Node >=22.5.
2. `npm ci`, `npm test` e `npm run check:mvp` em Linux, sem depender do GitHub Actions.
3. Abrir `/painel` e verificar login; requisições sem autenticação a status, QR, grupos e escrita devem ser rejeitadas.
4. Verificar QR somente após login, seleção de grupos de origem e destino, status, pausa/retomada e histórico.
5. Simular uma oferta e confirmar que não houve mensagem enviada nem registro falso de envio.
6. Reiniciar o processo e verificar a recuperação da sessão WhatsApp **em ambiente controlado**, sem habilitar publicações.
7. Conferir que respostas HTTP, HTML, logs e repositório não expõem tokens, credenciais nem arquivos de sessão.

## Travas antes de qualquer publicação real
- Obter autorização explícita do operador e confirmar individualmente os JIDs de destino.
- Não ativar `AUTORIZAR_ENVIO_EXTENSAO`, `AUTORIZAR_ENVIO_PAINEL` ou `AUTORIZAR_ENVIO_WHATSAPP` antes da confirmação.
- Não remover os controles de pausa, dry-run, autenticação e revalidação de destinos.
- Testar uma única oferta apenas depois da autorização e com destino confirmado.

## Hospedagem
- Um serviço gratuito que hiberna interrompe o agendador e a conexão WhatsApp.
- Disco efêmero perde a autenticação após reinício ou redeploy. É necessário volume persistente privado para a sessão, protegido contra exposição HTTP e contra commits.
- `PORT` e proxy HTTPS não substituem armazenamento persistente, credenciais privadas ou execução contínua.
- O painel deve exigir token forte no acesso remoto, HTTPS e restrição das rotas de escrita.
- Credenciais de afiliados devem ser configuradas como segredos privados e nunca aparecer em logs ou respostas.

## Critério de conclusão
Só declarar o MVP operacional após testes Linux aprovados, login e QR reais validados, sessão recuperada após reinício, grupos confirmados e um teste de envio **explicitamente autorizado**. Commits e verificações estáticas isoladamente não comprovam publicação ponta a ponta.
