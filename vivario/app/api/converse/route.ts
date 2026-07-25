import Anthropic from "@anthropic-ai/sdk";
import {
  EFFORTS,
  LIMITS,
  MODELS,
  type AgentConfig,
  type ConverseRequest,
  type StreamEvent,
  type Turn,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL_IDS = new Set<string>(MODELS.map((m) => m.id));

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseAgent(raw: unknown, fallbackName: string): AgentConfig {
  const a = (raw ?? {}) as Partial<AgentConfig>;
  const model = typeof a.model === "string" && MODEL_IDS.has(a.model) ? a.model : "claude-opus-5";
  return {
    name: (typeof a.name === "string" && a.name.trim() ? a.name : fallbackName)
      .slice(0, LIMITS.name)
      .trim(),
    persona: (typeof a.persona === "string" ? a.persona : "").slice(0, LIMITS.persona).trim(),
    model: model as AgentConfig["model"],
  };
}

function parseRequest(body: unknown): ConverseRequest {
  const b = (body ?? {}) as Partial<ConverseRequest>;
  const agents = Array.isArray(b.agents) ? b.agents : [];
  const effort = EFFORTS.includes(b.effort as never) ? b.effort! : "low";

  return {
    topic: (typeof b.topic === "string" ? b.topic : "").slice(0, LIMITS.topic).trim(),
    turns: clamp(Math.round(Number(b.turns) || 8), LIMITS.turns.min, LIMITS.turns.max),
    maxWords: clamp(Math.round(Number(b.maxWords) || 80), LIMITS.maxWords.min, LIMITS.maxWords.max),
    effort,
    agents: [parseAgent(agents[0], "Agente A"), parseAgent(agents[1], "Agente B")],
  };
}

/**
 * O prompt de sistema é a única coisa que separa os dois agentes: cada um vê o
 * outro como interlocutor humano (`user`) e a si mesmo como `assistant`.
 */
function systemPrompt(req: ConverseRequest, speaker: 0 | 1): string {
  const me = req.agents[speaker];
  const other = req.agents[speaker === 0 ? 1 : 0];

  return [
    `Você é ${me.name}.`,
    me.persona,
    "",
    `Você está numa conversa ao vivo com ${other.name}${other.persona ? `, que é: ${other.persona}` : ""}.`,
    req.topic ? `Tema da conversa: ${req.topic}` : "",
    "",
    "Como responder:",
    `- Fale em primeira pessoa, direto com ${other.name}, como numa conversa real.`,
    "- Não escreva seu nome como prefixo, não narre ações, não use asteriscos de narração.",
    `- Máximo de ${req.maxWords} palavras por fala. Uma ideia por vez.`,
    `- Reaja ao que ${other.name} acabou de dizer: discorde, aprofunde ou puxe o fio. Não repita o que já foi dito.`,
    "- Não resuma a conversa nem tente encerrá-la; ela continua.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Monta o histórico do ponto de vista de quem vai falar. */
function messagesFor(
  req: ConverseRequest,
  speaker: 0 | 1,
  transcript: Turn[],
): Anthropic.MessageParam[] {
  const history: Anthropic.MessageParam[] = transcript.map((t) => ({
    role: t.agent === speaker ? "assistant" : "user",
    content: t.text,
  }));

  // O primeiro item precisa ser `user`. Para o agente que abre a conversa,
  // o histórico começa com a própria fala — então injetamos a deixa inicial.
  if (history.length === 0 || history[0].role === "assistant") {
    history.unshift({
      role: "user",
      content: req.topic
        ? `Vamos conversar sobre: ${req.topic}. Comece você.`
        : `Comece a conversa, ${req.agents[speaker].name}.`,
    });
  }

  return history;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY não está configurada no ambiente." },
      { status: 500 },
    );
  }

  let req: ConverseRequest;
  try {
    req = parseRequest(await request.json());
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();
  const transcript: Turn[] = [];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        for (let index = 0; index < req.turns; index++) {
          if (request.signal.aborted) break;

          const speaker: 0 | 1 = index % 2 === 0 ? 0 : 1;
          const agent = req.agents[speaker];
          send({ type: "turn_start", index, agent: speaker });

          const messageStream = client.messages.stream(
            {
              model: agent.model,
              max_tokens: 4000,
              system: systemPrompt(req, speaker),
              messages: messagesFor(req, speaker, transcript),
              output_config: { effort: req.effort },
            },
            { signal: request.signal },
          );

          let text = "";
          for await (const event of messageStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              text += event.delta.text;
              send({ type: "delta", index, text: event.delta.text });
            }
          }

          const message = await messageStream.finalMessage();
          transcript.push({ index, agent: speaker, text: text.trim() });
          send({
            type: "turn_end",
            index,
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
          });

          if (message.stop_reason === "refusal") {
            send({
              type: "error",
              message: `${agent.name} recusou-se a responder (política de conteúdo). Conversa interrompida.`,
            });
            break;
          }
        }

        send({ type: "done" });
      } catch (error) {
        if (!request.signal.aborted) {
          const message =
            error instanceof Anthropic.APIError
              ? `Erro da API (${error.status}): ${error.message}`
              : error instanceof Error
                ? error.message
                : "Erro desconhecido.";
          send({ type: "error", message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
