# Automação de E-mail — Atelier Senza Pari (n8n + iCloud+)

Workflows do n8n prontos para importar, implementando o plano de automação de e-mail descrito no documento de referência (roteamento, resposta com IA, notificação no WhatsApp e integração com o CRM HubSpot).

Estes arquivos são independentes do site (`index.html`, etc.) — são exportações de workflow do n8n, feitas para serem importadas na sua instância do n8n (self-host ou n8n cloud).

## Status atual (WhatsApp pendente)

A conta de WhatsApp Business dessa empresa ainda **não tem um App técnico conectado no Meta for Developers** — só a conta de WhatsApp Business "normal" existe, sem acesso à API. Sem esse App não dá pra gerar o token da Meta Graph API, então:

- **Workflow 3** (notificação de e-mail urgente no WhatsApp) fica **pausado** até esse App existir e o token ser gerado.
- **Workflow 2** foi ajustado pra mandar o rascunho da resposta **por e-mail** (pra `luciano@ateliersenzapari.com.br`) em vez de WhatsApp, então funciona normalmente sem depender da Meta.
- **Workflows 1 e 4** nunca dependeram de WhatsApp — não são afetados.

Quando o App do WhatsApp Business existir e o token estiver em mãos, é só importar o Workflow 3 e, se quiser, trocar o node de e-mail do Workflow 2 de volta pra WhatsApp (mesmo padrão de chamada usado no Workflow 3).

## Arquivos

| Arquivo | O que faz |
|---|---|
| `workflow-1-roteamento.json` | Lê `contato@`, classifica por palavra-chave/remetente e encaminha para `financeiro@`, `vendas@` ou `luciano@`. Sem regra → fica em `contato@` para revisão manual. |
| `workflow-2-resposta-ia.json` | Gera resposta com a API da Claude para e-mails em `vendas@`/`contato@` e manda um rascunho **por e-mail** pro Luciano aprovar (temporariamente, no lugar do WhatsApp — ver "Status atual" acima). Envio automático fica **desligado por padrão**. |
| `workflow-3-notificacao-whatsapp.json` | Avisa no WhatsApp quando um e-mail contém palavra crítica (`contrato`, `pagamento`, `urgente`, `Hapvida`, `BTG`, `Sefaz`). **Pausado até o App do WhatsApp Business existir.** |
| `workflow-4-crm.json` | Cria/atualiza um contato no HubSpot a partir de e-mails recebidos em `vendas@` (sem anexar nota — essa conta HubSpot não tem o escopo de Notes disponível). |

## Passo a passo

### 1. Gerar a senha de app do Apple ID

Em [appleid.apple.com](https://appleid.apple.com) → Segurança → Senhas de App → gerar uma senha específica para o n8n.

**Nunca use a senha normal do Apple ID.** Essa senha de app é revogável a qualquer momento, sem afetar o login normal.

Se você tem `contato@`, `financeiro@`, `luciano@` e `vendas@` como contas/alias separados no iCloud+, gere uma senha de app por conta usada nos workflows (os workflows 2 e 4 usam contas IMAP dedicadas para `vendas@`).

### 2. Criar as credenciais no n8n

Crie estas credenciais no n8n **antes** de importar os workflows (os nomes abaixo já batem com os nomes usados nos arquivos — se você usar nomes diferentes, terá que reselecionar a credencial em cada node depois de importar):

- **IMAP** `iCloud IMAP - contato@ateliersenzapari.com.br`
  - Host: `imap.mail.me.com`, Porta: `993`, SSL: sim
  - Usuário: `contato@ateliersenzapari.com.br`, Senha: senha de app
- **IMAP** `iCloud IMAP - vendas@ateliersenzapari.com.br` (mesma coisa, para a conta `vendas@`)
- **SMTP** `iCloud SMTP - contato@ateliersenzapari.com.br`
  - Host: `smtp.mail.me.com`, Porta: `587`, STARTTLS: sim
  - Mesmo usuário/senha de app da conta `contato@`
- **HTTP Header Auth** `Anthropic API Key`
  - Nome do header: `x-api-key`
  - Valor: a mesma chave da API Claude já usada no bot do WhatsApp
- **HTTP Header Auth** `Meta Graph API - WhatsApp Business` (só necessário pro Workflow 3 — **pendente**, ver "Status atual")
  - Nome do header: `Authorization`
  - Valor: `Bearer <token do App do WhatsApp Business, gerado via Usuário do Sistema no Business Settings>`
- **HTTP Header Auth** `HubSpot Private App Token` (só necessário para o Workflow 4)
  - Nome do header: `Authorization`
  - Valor: `Bearer <seu token de app privado do HubSpot>`
  - Para gerar o token: no HubSpot, vá em **Configurações (⚙) → Integrações → Apps privados → Criar app privado**. Dê um nome (ex: "n8n - Automação de E-mail") e, na aba **Escopos**, use a busca e marque:
    - `crm.objects.contacts.read`
    - `crm.objects.contacts.write`
  - `crm.objects.notes.*` não está disponível nessa conta HubSpot (testamos e não aparece na lista de escopos, mesmo em plano pago) — por isso o Workflow 4 não cria nota, só o contato.
  - Clique em **Criar app** e copie o token que aparece (começa com `pat-...`) — ele só é mostrado uma vez.

### 3. Importar os workflows

No n8n: **Workflows → Import from File** → selecione cada `.json`. Repita para os 4 arquivos.

### 4. Preencher os placeholders

- Em `workflow-2-resposta-ia.json`, o node **Config** já vem preenchido: `emailAprovacao = luciano@ateliersenzapari.com.br` (pra onde vai o rascunho da resposta gerada pela IA). Troque se quiser mandar pra outro endereço.
- Em `workflow-3-notificacao-whatsapp.json` (quando for importar, depois do WhatsApp liberado), o node **Config** já vem preenchido:
  - `numeroWhatsappLuciano = 5581992492027` (o mesmo número usado no botão de WhatsApp do site, em `contato.html`). Se não for o número certo para receber essas notificações, troque no node Config.
  - `whatsappPhoneNumberId = 1072860789244510` (pego via API Setup no Meta for Developers — confirme se ainda é o mesmo quando o App novo existir, pode mudar).
- `workflow-4-crm.json` não tem placeholder de URL — o endpoint já é o oficial da API do HubSpot (`api.hubapi.com`). Só falta criar a credencial `HubSpot Private App Token` (passo 2 acima) e selecioná-la no node HTTP Request, caso o n8n não puxe automaticamente pelo nome.
  - O workflow usa o e-mail do remetente como identificador único: se a pessoa já for um contato no HubSpot, ele **atualiza** (não duplica); se não existir, **cria** um contato novo com `lifecyclestage = lead` e `hs_lead_status = NEW`.
  - O assunto e o corpo do e-mail não são gravados no HubSpot (sem escopo de Notes) — ficam só na caixa `vendas@` mesmo. Se um dia esse escopo for liberado na conta, é só me chamar que eu recoloco a etapa de nota.

### 5. Ordem recomendada de ativação

1. Configurar credenciais IMAP/SMTP (passos 1-2 acima)
2. **Workflow 1** (roteamento) — testar em execução manual por alguns dias antes de ativar o trigger
3. **Workflow 4** (HubSpot) — ativar depois de criar o app privado e confirmar que o token tem os 2 escopos de `contacts` listados no passo 2
4. **Workflow 2** (resposta IA) — manter `envioAutomatico = false` no node Config por 2-3 semanas, validando a qualidade das respostas pelo rascunho que chega por e-mail. Só depois disso mudar para `true`.
5. **Workflow 3** (notificação WhatsApp) — importar só quando o App do WhatsApp Business existir e o token estiver pronto (ver "Status atual" no topo deste README)

## Observações de segurança

- Nunca usar a senha principal do Apple ID no n8n — sempre a senha de app dedicada, revogável a qualquer momento.
- `financeiro@` é tratado com mais cuidado: o Workflow 2 (resposta automática) propositalmente **não** cobre essa caixa.
- Rate limit do iCloud: os triggers IMAP usam `forceReconnect: 120` (reconecta a cada ~2 min), dentro do limite seguro sugerido no plano original. Evite configurar um intervalo menor que esse.

## Depois de importar

Os nodes de Switch/If e os campos de credencial podem exigir pequenos ajustes dependendo da versão do seu n8n (o n8n avisa automaticamente se algum node precisa de atualização de versão). Revise a lógica de palavras-chave nos nodes de Code (`Classificar E-mail`, `Verificar Palavras Criticas`) e ajuste conforme o volume real de e-mails.
