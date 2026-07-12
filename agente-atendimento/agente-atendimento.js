require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { createClient, askClaude } = require('./assistant');

const {
  PORT = 3000,
  ANTHROPIC_API_KEY,
  META_WHATSAPP_TOKEN,
  META_PHONE_NUMBER_ID,
  META_VERIFY_TOKEN,
  META_APP_SECRET,
  HUMAN_HANDOFF_WHATSAPP_NUMBER,
} = process.env;

for (const [name, value] of Object.entries({
  ANTHROPIC_API_KEY, META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID, META_VERIFY_TOKEN,
})) {
  if (!value) console.warn(`[aviso] variável de ambiente ${name} não definida — veja .env.example`);
}

const anthropic = createClient(ANTHROPIC_API_KEY);
const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

const CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000; // janela de atendimento de 24h do WhatsApp
const MAX_HISTORY_MESSAGES = 12;

// Estado de conversa em memória: telefone -> { history, handedOff, updatedAt }
// Em produção com múltiplas instâncias, trocar por Redis ou outro store compartilhado.
const conversations = new Map();

function getConversation(phone) {
  const existing = conversations.get(phone);
  if (existing && Date.now() - existing.updatedAt < CONVERSATION_TTL_MS) return existing;
  const fresh = { history: [], handedOff: false, updatedAt: Date.now() };
  conversations.set(phone, fresh);
  return fresh;
}

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v20.0/${META_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!response.ok) {
    console.error(`[whatsapp] falha ao enviar mensagem para ${to}:`, response.status, await response.text());
  }
}

async function notifyHumanHandoff(customerPhone, lastMessage) {
  if (!HUMAN_HANDOFF_WHATSAPP_NUMBER) return;
  await sendWhatsAppMessage(
    HUMAN_HANDOFF_WHATSAPP_NUMBER,
    `⚠️ Atendimento humano solicitado.\nCliente: ${customerPhone}\nÚltima mensagem: "${lastMessage}"`
  );
}

async function handleIncomingMessage(customerPhone, messageText) {
  const conversation = getConversation(customerPhone);
  conversation.updatedAt = Date.now();

  if (conversation.handedOff) return; // já está com um humano, o bot fica em silêncio

  conversation.history.push({ role: 'user', content: messageText });
  conversation.history = conversation.history.slice(-MAX_HISTORY_MESSAGES);

  const { reply, shouldHandoff } = await askClaude(anthropic, conversation.history);

  if (reply) {
    conversation.history.push({ role: 'assistant', content: reply });
    await sendWhatsAppMessage(customerPhone, reply);
  }

  if (shouldHandoff) {
    conversation.handedOff = true;
    await sendWhatsAppMessage(
      customerPhone,
      'Já chamei um atendente do Atelier pra te ajudar com isso — em breve alguém da equipe continua por aqui. 🙏'
    );
    await notifyHumanHandoff(customerPhone, messageText);
  }
}

// Verificação do webhook exigida pela Meta ao cadastrar a URL
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

function isValidSignature(req) {
  if (!META_APP_SECRET) return true; // sem segredo configurado — não recomendado em produção
  const signature = req.get('x-hub-signature-256');
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', META_APP_SECRET).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

app.post('/webhook', async (req, res) => {
  if (!isValidSignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // confirma recebimento antes de processar, para a Meta não reenviar o evento

  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return; // evento sem mensagem (ex: status de entrega/leitura)

    const customerPhone = message.from;

    if (message.type !== 'text') {
      await sendWhatsAppMessage(customerPhone, 'Por enquanto só consigo ler mensagens de texto — pode escrever sua dúvida? 🙂');
      return;
    }

    await handleIncomingMessage(customerPhone, message.text.body);
  } catch (err) {
    console.error('[webhook] erro ao processar mensagem:', err);
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Agente de atendimento Senza Pari rodando na porta ${PORT}`);
});
