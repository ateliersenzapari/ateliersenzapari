# Automação Instagram - Atelier Senza Pari

## 📋 Status de Setup

- ✅ Buffer conectado via n8n (API GraphQL nova — `api.buffer.com`, não a REST antiga `/1/...`)
- ✅ Credencial `Header Auth account` configurada no n8n (httpHeaderAuth, header `Authorization: Bearer <token>`)
- ✅ Instagram Business `@ateliersenzapari` conectado no Buffer
- ✅ Primeiro post de teste publicado com sucesso (ver "Post de teste" abaixo)

**IDs conhecidos:**
- Organization ID: `6a56faeaffc5fa0c4f864e19`
- Instagram Channel ID: `6a570b3080cc80cdcab86492`

⚠️ **Nunca commitar o token real neste arquivo ou em qualquer lugar do repo.** O token fica só na credencial do n8n (`Header Auth account`, id `f4bRFl5zmjKGFAgE`).

---

## 🔑 API do Buffer — GraphQL (não a REST antiga)

A Buffer migrou para uma API GraphQL. Toda automação usa:

- **Endpoint:** `POST https://api.buffer.com`
- **Auth:** header `Authorization: Bearer <token>` (Personal Access Key, gerado em Buffer → Settings → Developer → Buffer API → Personal Keys)
- **Content-Type:** `application/json`
- **Corpo:** `{ "query": "...", "variables": { ... } }`

Docs oficiais: https://developers.buffer.com

### Descobrir organizationId
```graphql
query GetOrganizations { account { organizations { id name } } }
```

### Descobrir canais conectados (ex: Instagram)
```graphql
query GetChannels($orgId: OrganizationId!) {
  channels(input: { organizationId: $orgId }) {
    id name displayName service avatar
  }
}
```

### Publicar um post (mutation completa e testada)
```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}
```

Variáveis (exemplo real, testado com sucesso):
```json
{
  "input": {
    "channelId": "6a570b3080cc80cdcab86492",
    "text": "Legenda do post...",
    "assets": [{ "image": { "url": "https://ateliersenzapari.com.br/nome-da-imagem.jpg" } }],
    "schedulingType": "automatic",
    "mode": "shareNow",
    "metadata": {
      "instagram": { "type": "post", "shouldShareToFeed": true }
    }
  }
}
```

**Campos obrigatórios para Instagram:**
- `metadata.instagram.type`: `post` | `reel` | `story` (outros valores existem mas não são válidos p/ Instagram: `short`, `whats_new`, `offer`, `event`, `carousel`, `ghost_post`, `thread`)
- `metadata.instagram.shouldShareToFeed`: boolean, obrigatório

**Enums úteis:**
- `schedulingType`: `automatic` (publica direto) | `notification` (só notifica pra postar manual)
- `mode`: `addToQueue` | `shareNow` | `shareNext` | `customScheduled`

---

## 🎯 Workflows

### 1. **Daily Content Scheduler** — ✅ construído e testado
**Workflow:** [Instagram - Daily Content Scheduler](https://senza-pari.app.n8n.cloud/workflow/WpKsvYJDw2dnfRyI) (`WpKsvYJDw2dnfRyI`)
**Acionamento:** Diariamente às 09:03 (Schedule Trigger)
**Função:** Lê a Data Table `Instagram Content Calendar` e publica automaticamente via `createPost`

**Data Table:** `Instagram Content Calendar` (id `CLNLJqbgy4K7cyqh`, projeto pessoal)

| Coluna | Tipo | Descrição |
|---|---|---|
| `scheduledDate` | date | Data agendada para publicação |
| `postType` | string | `post`, `reel` ou `story` |
| `caption` | string | Legenda do post |
| `imageUrl` | string | URL pública da imagem |
| `status` | string | `pending` → `published` ou `failed` |
| `bufferPostId` | string | Preenchido automaticamente após publicar |
| `errorMessage` | string | Preenchido automaticamente se falhar |

**Como adicionar um post ao calendário:** inserir uma linha na Data Table com `status = pending`, `scheduledDate` na data desejada, `postType`, `caption` e `imageUrl`. O workflow roda todo dia às 09:03, pega todas as linhas `pending` com `scheduledDate` até hoje, e publica cada uma.

**Fluxo real implementado:**
```
Schedule Trigger (09:03 diário)
    ↓
Get Due Posts (Data Table: status=pending AND scheduledDate <= hoje)
    ↓
Loop Content Calendar (1 por vez)
    ↓
Publish to Instagram (createPost mutation via Buffer GraphQL)
    ↓
Published Successfully? (IF: __typename === PostActionSuccess)
    ├─ true  → Mark as Published (status=published, bufferPostId=...)
    └─ false → Mark as Failed (status=failed, errorMessage=...)
    ↓ (ambos voltam pro loop)
```

**Limitação atual:** `channelId` do Instagram está fixo no node `Publish to Instagram` (single-channel). Se no futuro a Atelier tiver mais de uma conta/canal, isso vira uma coluna na Data Table.

**Testado em 2026-07-15:** 2 linhas de teste passaram pelo pipeline completo (Buffer mockado para não publicar de verdade), confirmando leitura do calendário, loop, atualização de status e tratamento de sucesso/erro. Linhas de teste removidas após validação.

⚠️ **Workflow ainda está INATIVO** (não publicado/ativado no n8n) — precisa ser ativado manualmente na UI do n8n (toggle "Active") para rodar sozinho todo dia. Enquanto inativo, só roda via execução manual.

---

### 2. **Auto-Reply to Comments** (Respostas Automáticas)
**Acionamento:** Polling a cada 15 minutos
**Função:** Monitora comentários e responde automaticamente via IA

---

### 3. **Capture DM Leads** (Captura de Mensagens)
**Acionamento:** Polling a cada 30 minutos
**Função:** Captura DMs e salva em planilha/CRM para follow-up

---

### 4. **Analytics Dashboard** (Relatório Diário)
**Acionamento:** Diariamente à noite
**Função:** Coleta métricas e envia relatório por email

---

## ✅ Post de Teste (referência)

Publicado com sucesso em 2026-07-15 via workflow `Buffer Setup - Get Profiles (v2 - GraphQL)`
(https://senza-pari.app.n8n.cloud/workflow/HkIWw3gV4JElz6rf):

- Canal: `@ateliersenzapari` (Instagram)
- Imagem: `https://ateliersenzapari.com.br/alabaster-ceramic-cover.jpg`
- Post ID retornado pelo Buffer: `6a5717000c92fc86088c8609`
- Resultado: `PostActionSuccess`

---

## 🔗 Links Úteis

- **Buffer API Docs (GraphQL):** https://developers.buffer.com
- **n8n workflow de setup/teste:** https://senza-pari.app.n8n.cloud/workflow/HkIWw3gV4JElz6rf
- **n8n Docs:** https://docs.n8n.io

---

## ⚠️ Notas Importantes

1. **Nunca commitar tokens/segredos neste repositório** — usar sempre credenciais do n8n.
2. Buffer parece invalidar Personal Keys anteriores ao gerar uma nova — se a credencial no n8n parar de funcionar, gerar novo token e atualizar a credencial `Header Auth account`.
3. Sempre testar workflows manualmente (execução `manual`) antes de ativar agendamento em produção.
4. `shouldShareToFeed` é obrigatório em posts do Instagram mesmo quando não é um Reel/Story.

---

**Última atualização:** 2026-07-15 — Daily Content Scheduler construído, testado end-to-end e pronto para ativação.
