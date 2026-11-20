# MVP web — operação segura e critérios de homologação

Este painel controla o processo original iniciado por `node index.js` e servido por `src/localServer.js`. **Não use `render-preview.js` como aplicação de produção.** O motor existente de coleta, conversão de links, agendamento, grupos e envio deve permanecer a fonte de verdade.

## Antes de liberar acesso remoto

- Usar Node.js >= 22.5 e instalar dependências do `package.json`.
- Configurar `PAINEL_TOKEN` forte por variável de ambiente, nunca no repositório nem no HTML.
- Servir o painel exclusivamente por HTTPS em acesso público, com autenticação obrigatória.
- Manter segredos de afiliados, cookies e credenciais WhatsApp fora do Git e dos logs públicos.
- Confirmar que `GET /painel` e endpoints privados rejeitam acesso remoto não autenticado.
- Confirmar que rotas de escrita rejeitam sessões inválidas e origens diferentes.
- Não configurar `AUTORIZAR_ENVIO_EXTENSAO=sim` antes de testar em modo simulado e confirmar os JIDs de destino.
- Nunca publicar conteúdo real em grupos sem autorização explícita do operador.

## Testes sem GitHub Actions

Executar em checkout Linux isolado:

```sh
node --version
npm ci
npm test
npm run check:mvp
```

Em seguida validar manualmente, **sem envios reais**: login remoto, QR Code sob autenticação, lista de grupos de origem e destino, status, pausa/retomada, histórico e simulação de uma oferta. Testar bloqueio de `POST /post` sem token, com origem divergente, com operação pausada, com dry-run e sem JIDs confirmados. Repetir testes atrás do proxy HTTPS real antes de homologar.

## Dependências operacionais e impedimentos

- **WhatsApp:** QR Code exige pareamento humano; reconexão e persistência da sessão precisam ser comprovadas após reiniciar o processo.
- **Hospedagem gratuita:** instâncias que dormem, encerram processos ou apagam disco local não garantem bot contínuo nem sessão persistente. Escolher serviço com processo sempre ativo e armazenamento persistente, ou manter motor no PC e expor somente painel protegido.
- **Afiliados:** cada plataforma precisa de credenciais/identificadores válidos para validar links gerados.
- **Grupos:** origem/destino precisam ser escolhidos e os destinos explicitamente confirmados pelo operador.
- **Homologação:** testes unitários aprovados não substituem teste integrado do servidor e validação ponta a ponta com autorização expressa.

## Critério de entrega

Marcar MVP como operacional apenas depois de: suíte original aprovada; painel autenticado no ambiente final; sessão WhatsApp persistente; grupos selecionáveis; simulação correta; pausa efetiva; histórico verificável; e um envio real **somente após** autorização explícita e confirmação dos destinos.
