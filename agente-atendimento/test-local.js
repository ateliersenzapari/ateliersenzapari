require('dotenv').config();
const readline = require('readline');
const { createClient, askClaude } = require('./assistant');

const { ANTHROPIC_API_KEY } = process.env;

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY não definida. Configure o arquivo .env antes de rodar este teste.');
  process.exit(1);
}

const anthropic = createClient(ANTHROPIC_API_KEY);
const history = [];

console.log('Conversando com a Claudia (Atelier Senza Pari). Não usa WhatsApp nem Meta — só o Claude.');
console.log('Digite sua mensagem e aperte Enter. Ctrl+C para sair.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'Você: ' });
rl.prompt();

rl.on('line', async (line) => {
  const messageText = line.trim();
  if (!messageText) return rl.prompt();

  history.push({ role: 'user', content: messageText });

  try {
    const { reply, shouldHandoff } = await askClaude(anthropic, history);
    if (reply) {
      history.push({ role: 'assistant', content: reply });
      console.log(`\nClaudia: ${reply}\n`);
    }
    if (shouldHandoff) {
      console.log('[sistema] → esta conversa seria encaminhada para um atendente humano agora.\n');
    }
  } catch (err) {
    console.error('\n[erro ao chamar o Claude]', err.message, '\n');
  }

  rl.prompt();
});
