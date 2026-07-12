const Anthropic = require('@anthropic-ai/sdk');
const knowledgeBase = require('./knowledge-base.json');

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const HANDOFF_TAG = '[ENCAMINHAR_HUMANO]';

function buildSystemPrompt() {
  return [
    'Você é a Claudia, assistente virtual de atendimento do Atelier Senza Pari no WhatsApp.',
    'Responda SOMENTE com base nos dados de BASE_DE_CONHECIMENTO (JSON) abaixo. Nunca invente preços, prazos ou políticas.',
    'Se a resposta depender de um campo marcado como "[PREENCHER]" na base, diga que um atendente humano vai confirmar esse detalhe.',
    `Se o cliente pedir para falar com uma pessoa, quiser fechar pedido/pagamento, reclamar de defeito, ou perguntar algo fora do escopo do Atelier, responda educadamente e finalize com a tag exata ${HANDOFF_TAG} em uma linha própria — o sistema cuida do encaminhamento, você não precisa avisar isso ao cliente.`,
    `Tom de voz: ${knowledgeBase.marca.tom_de_voz.estilo}`,
    '',
    'BASE_DE_CONHECIMENTO:',
    JSON.stringify(knowledgeBase),
  ].join('\n');
}

const SYSTEM_PROMPT = buildSystemPrompt();

function createClient(apiKey) {
  return new Anthropic({ apiKey });
}

/**
 * Envia o histórico de mensagens (formato [{role, content}]) para o Claude
 * e retorna a resposta já sem a tag de encaminhamento, além de um flag indicando
 * se a conversa deve ser passada para um atendente humano.
 */
async function askClaude(anthropicClient, history) {
  const completion = await anthropicClient.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  let reply = completion.content?.[0]?.text?.trim() || '';
  const shouldHandoff = reply.includes(HANDOFF_TAG);
  reply = reply.replace(HANDOFF_TAG, '').trim();

  return { reply, shouldHandoff };
}

module.exports = { CLAUDE_MODEL, HANDOFF_TAG, SYSTEM_PROMPT, createClient, askClaude };
