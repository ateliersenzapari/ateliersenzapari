# Automação Instagram - Atelier Senza Pari

## 📋 Status de Setup

- ✅ Buffer MCP conectado
- ✅ n8n configurado e pronto
- ⏳ Aguardando: Token Buffer + Account ID
- ⏳ Aguardando: Credencial httpHeaderAuth no n8n

---

## 🎯 Workflows Planejados

### 1. **Daily Content Scheduler** (Publicação Automática)
**Acionamento:** Diariamente às 9h (configurável)  
**Função:** Lê calendário de conteúdo e publica automaticamente

**Fluxo:**
```
Schedule Trigger (09:00) 
    ↓
Read Calendar (Google Sheets / n8n Data Table)
    ↓
Check if Post Exists Today
    ↓
Format Post Data
    ↓
Publish via Buffer API
    ↓
Log Result
```

**Dados esperados:**
- Data do post (YYYY-MM-DD)
- Tipo (Post, Story, Reel)
- Legenda/Caption
- URL da imagem (ou enviar como arquivo)
- Hashtags (opcional)

---

### 2. **Auto-Reply to Comments** (Respostas Automáticas)
**Acionamento:** A cada 15 minutos (polling)  
**Função:** Monitora comentários e responde automaticamente

**Fluxo:**
```
Schedule Trigger (a cada 15 min)
    ↓
Fetch Comments via Buffer API
    ↓
Filter Unanswered Comments
    ↓
Classify Comment (Pergunta, Complimento, etc)
    ↓
Generate Reply (Anthropic API)
    ↓
Post Reply
    ↓
Mark as Answered
```

---

### 3. **Capture DM Leads** (Captura de Mensagens)
**Acionamento:** A cada 30 minutos  
**Função:** Captura DMs e salva em planilha para follow-up

**Fluxo:**
```
Schedule Trigger (a cada 30 min)
    ↓
Fetch New DMs via Buffer API
    ↓
Extract Lead Info (Nome, Email/Username, Mensagem)
    ↓
Save to Google Sheets / Airtable
    ↓
Send Notification (Email/Slack)
```

---

### 4. **Analytics Dashboard** (Relatório Diário)
**Acionamento:** Diariamente às 21h  
**Função:** Coleta métricas e envia relatório

**Fluxo:**
```
Schedule Trigger (21:00)
    ↓
Fetch Daily Metrics (Buffer API)
    ↓
Calculate Insights (Likes, Comments, Reaches)
    ↓
Format Report
    ↓
Send Email Report
```

---

## 🔑 Credenciais Necessárias no n8n

### 1. Buffer API (httpHeaderAuth)
**Tipo:** `httpHeaderAuth`  
**Nome da Credencial:** `Buffer API Token`  
**Header Name:** `Authorization`  
**Header Value:** `Bearer -LK5vRHWQK4s0GhoWcSvoWgBKBhOx1mF1itUCMldBil`

### 2. Anthropic API (para respostas automáticas)
**Já configurado:** ✅ `Anthropic API Key`

### 3. Google Sheets (opcional, para calendário)
**Tipo:** `googleSheets`  
**Uso:** Armazenar calendário de conteúdo

### 4. Airtable (opcional, para leads)
**Tipo:** `airtable`  
**Uso:** Armazenar leads capturados

---

## 🚀 Próximos Passos

### Fase 1: Validação (Hoje)
1. ✅ Criar credencial httpHeaderAuth com seu token Buffer
2. ✅ Testar conexão com Buffer API
3. ✅ Extrair Instagram Account ID

### Fase 2: MVP (Amanhã)
1. Criar Data Table com calendário de posts
2. Montar o workflow "Daily Content Scheduler"
3. Fazer teste manual de publicação

### Fase 3: Automação Completa (Próxima semana)
1. Montar "Auto-Reply to Comments"
2. Montar "Capture DM Leads"
3. Montar "Analytics Dashboard"

---

## 📱 Credenciais Buffer - Como Verificar

### Account ID do Instagram no Buffer:

```bash
# Via curl (com seu token):
curl -s "https://api.buffer.com/1/user.json?access_token=SEU_TOKEN" \
  | jq '.connected_social_profiles[] | select(.service=="instagram")'
```

**Resposta esperada:**
```json
{
  "service": "instagram",
  "id": "12345678900",
  "formatted_username": "@ateliersenzapari"
}
```

Copie o valor de `"id"` — esse é seu **Instagram Account ID**.

---

## 🔗 Links Úteis

- **Buffer API Docs:** https://buffer.com/developers/api
- **n8n Docs:** https://docs.n8n.io
- **Schedule Trigger:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/
- **HTTP Request:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/

---

## ⚠️ Notas Importantes

1. **Token Expiração:** Tokens do Buffer via usuário de sistema não expiram
2. **Rate Limiting:** Buffer API tem limite de 150 requisições/hora
3. **Sincronização:** Sempre testar workflows manualmente ANTES de ativar agendamento
4. **Permissões:** Certifique-se que seu token tem permissões para: `updates:create`, `updates:approve`, `updates:publish`

---

## 📝 Status de Implementação

| Workflow | Status | Progresso |
|----------|--------|-----------|
| Daily Content Scheduler | ⏳ Aguardando token | 10% |
| Auto-Reply Comments | 📋 Planejado | 5% |
| Capture DM Leads | 📋 Planejado | 5% |
| Analytics Dashboard | 📋 Planejado | 5% |

---

**Criado em:** 2026-07-15  
**Próxima atualização:** Após validação do token Buffer
