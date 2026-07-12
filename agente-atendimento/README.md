# Agente de Atendimento — Atelier Senza Pari

Bot de atendimento via WhatsApp para a SENZA PARI. Recebe mensagens pelo webhook da Meta Graph API (WhatsApp Business), responde usando a base de conhecimento da marca via OpenAI (`gpt-4o-mini`) e encaminha a conversa para um atendente humano quando necessário (fechamento de pedido, reclamação, ou pergunta fora do que a base sabe responder).

## Estrutura

```
agente-atendimento/
├── agente-atendimento.js   # servidor Node/Express
├── knowledge-base.json     # base de conhecimento (marca, coleções, FAQ, políticas)
├── package.json
├── .env.example
└── .gitignore
```

## 1. Preencher a base de conhecimento

`knowledge-base.json` já vem preenchido com o conteúdo real do site (ateliersenzapari.com.br) — marca, coleções, linhas de produto, FAQ, política de trocas e guia de cuidados. Os campos marcados `"[PREENCHER]"` são dados que **não existem publicados no site** e precisam ser preenchidos manualmente antes de colocar o agente em produção, principalmente:

- `precos.tabela_de_precos` — preços reais por linha/material/dispositivo (hoje o site só mostra "Sob consulta")
- `pedidos.prazo_producao_dias` e `pedidos.prazo_entrega_dias`
- `pedidos.frete.valor`
- `pedidos.formas_pagamento`
- `marca.contato.endereco_fisico` (se houver atendimento presencial)
- Cores/variantes de Alabaster Ceramic, Eclipse Titanium, L'Or Phénoménal, e modelos de iPhone compatíveis com as linhas Metal, Super Finas e Transparentes

Enquanto um campo estiver como `[PREENCHER]`, o agente foi instruído a **não inventar** a resposta — ele diz que um atendente humano vai confirmar e encaminha a conversa.

## 2. Pré-requisitos

- Node.js 18 ou superior
- Uma chave de API da OpenAI ([platform.openai.com/api-keys](https://platform.openai.com/api-keys))
- Uma conta em [Meta for Developers](https://developers.facebook.com/) com um App configurado para **WhatsApp Business Platform** (Graph API), incluindo:
  - `META_WHATSAPP_TOKEN` — token de acesso (em WhatsApp > API Setup)
  - `META_PHONE_NUMBER_ID` — ID do número de telefone conectado
  - `META_APP_SECRET` — App Secret (Configurações básicas do App), usado para validar a assinatura do webhook
  - Um `META_VERIFY_TOKEN` — qualquer string que você escolher, usada só para validar o cadastro do webhook

## 3. Setup local

```bash
cd agente-atendimento
npm install
cp .env.example .env
```

Preencha o `.env` com suas chaves reais. Depois rode:

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`). Endpoints:

- `GET /health` — checagem simples de que o servidor está no ar
- `GET /webhook` — usado pela Meta para validar o cadastro do webhook
- `POST /webhook` — recebe as mensagens do WhatsApp

### Testando o webhook localmente

A Meta precisa de uma URL pública HTTPS para enviar eventos. Para testar antes do deploy, exponha sua porta local com [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
```

Use a URL HTTPS gerada (ex: `https://abcd1234.ngrok-free.app/webhook`) na configuração do webhook na Meta (passo 5).

## 4. Deploy (Railway ou Render)

O agente é um processo Node contínuo (precisa ficar sempre no ar para receber webhooks), então **não roda em hospedagem compartilhada tipo Hostinger**. Recomendado: Railway ou Render (planos gratuitos/baratos já atendem).

### Railway

1. Crie um projeto novo em [railway.app](https://railway.app/) e conecte este repositório GitHub.
2. Configure o **Root Directory** do serviço como `agente-atendimento`.
3. Em Variables, adicione todas as variáveis do `.env.example` com os valores reais.
4. Build command: `npm install` — Start command: `npm start` (Railway detecta automaticamente pelo `package.json`).
5. Após o deploy, copie a URL pública gerada (ex: `https://seu-app.up.railway.app`).

### Render

1. Crie um **Web Service** novo em [render.com](https://render.com/) apontando para este repositório.
2. **Root Directory**: `agente-atendimento`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Adicione as variáveis de ambiente do `.env.example` em Environment.
6. Após o deploy, copie a URL pública gerada (ex: `https://seu-app.onrender.com`).

> No plano gratuito do Render o serviço "dorme" após um período sem tráfego, o que atrasa a primeira resposta depois de um tempo parado. Para atendimento ao vivo isso pode incomodar — considere um plano pago ou o Railway se isso for um problema.

## 5. Configurar o webhook na Meta

1. No painel do seu App em [developers.facebook.com](https://developers.facebook.com/), vá em **WhatsApp > Configuration**.
2. Em **Webhook**, clique em editar e informe:
   - **Callback URL**: `https://SEU-DOMINIO/webhook`
   - **Verify Token**: o mesmo valor que você colocou em `META_VERIFY_TOKEN`
3. Clique em **Verify and Save** — a Meta faz uma requisição `GET /webhook` que o servidor responde automaticamente se o token bater.
4. Em **Webhook fields**, inscreva-se no campo `messages`.
5. Envie uma mensagem de teste para o número do WhatsApp Business conectado e confira os logs do servidor.

## Como funciona o encaminhamento para humano

O agente responde perguntas usando somente o conteúdo de `knowledge-base.json`. Ele encaminha a conversa para um humano (e para de responder automaticamente àquele número, dentro da janela de 24h) quando:

- o cliente pede para falar com uma pessoa;
- o cliente quer fechar pedido, combinar pagamento ou entrega;
- há reclamação ou menção a defeito no produto;
- a resposta dependeria de um campo `[PREENCHER]` da base (preço exato, prazo exato, forma de pagamento etc.);
- a pergunta foge do escopo de produtos/marca do Atelier.

Se `HUMAN_HANDOFF_WHATSAPP_NUMBER` estiver configurado no `.env`, esse número recebe uma mensagem de WhatsApp avisando do encaminhamento, com o telefone do cliente e a última mensagem enviada.

## Próximos passos sugeridos (fora do escopo deste módulo)

- Painel administrativo para editar `knowledge-base.json` sem mexer em código
- Automações no n8n (ex: registrar conversas encaminhadas em uma planilha/CRM)
- Integração com CRM
- Geração/agendamento automático de conteúdo (posts, Reels, Stories)
