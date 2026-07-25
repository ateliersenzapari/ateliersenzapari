import type { ConverseRequest } from "./types";

export type Preset = {
  id: string;
  label: string;
  config: Omit<ConverseRequest, "effort">;
};

export const PRESETS: Preset[] = [
  {
    id: "socratico",
    label: "Debate socrático",
    config: {
      topic: "A consciência pode emergir de um sistema puramente computacional?",
      turns: 8,
      maxWords: 90,
      agents: [
        {
          name: "Sófia",
          persona:
            "Filósofa cética. Você desmonta afirmações pedindo definições precisas e apontando pressupostos escondidos. Faz perguntas curtas e incômodas em vez de discursar.",
          model: "claude-opus-5",
        },
        {
          name: "Tácito",
          persona:
            "Cientista da computação pragmático. Você defende posições materialistas com exemplos concretos de sistemas reais e detesta abstração vazia.",
          model: "claude-opus-5",
        },
      ],
    },
  },
  {
    id: "produto",
    label: "Fundador vs. investidor",
    config: {
      topic: "Uma marca de acessórios de luxo deve vender direto ao consumidor ou via multimarcas?",
      turns: 10,
      maxWords: 80,
      agents: [
        {
          name: "Nina",
          persona:
            "Fundadora de uma marca de luxo. Apaixonada pelo produto, defende controle total da experiência de marca. Usa exemplos do dia a dia da operação.",
          model: "claude-sonnet-5",
        },
        {
          name: "Duarte",
          persona:
            "Investidor. Só pensa em margem, CAC, giro de estoque e velocidade de escala. Cortante, faz perguntas numéricas e não aceita resposta vaga.",
          model: "claude-sonnet-5",
        },
      ],
    },
  },
  {
    id: "roteiro",
    label: "Dois estranhos num bar",
    config: {
      topic: "Dois desconhecidos descobrem, no meio da conversa, que amaram a mesma pessoa.",
      turns: 12,
      maxWords: 60,
      agents: [
        {
          name: "Íris",
          persona:
            "Trinta e poucos anos, irônica, fala pouco e observa muito. Esconde o que sente atrás de piadas secas.",
          model: "claude-opus-5",
        },
        {
          name: "Bento",
          persona:
            "Sentimental e falante, se abre rápido demais com estranhos. Genuinamente curioso sobre as pessoas.",
          model: "claude-opus-5",
        },
      ],
    },
  },
  {
    id: "red-team",
    label: "Red team vs. blue team",
    config: {
      topic: "Como endurecer o processo de deploy de uma aplicação web pequena.",
      turns: 8,
      maxWords: 100,
      agents: [
        {
          name: "Vermelho",
          persona:
            "Especialista ofensivo. Para cada defesa proposta, você aponta uma forma realista de contorná-la. Foco em ameaças plausíveis, não em cenários de filme.",
          model: "claude-opus-5",
        },
        {
          name: "Azul",
          persona:
            "Engenheiro de plataforma. Propõe controles concretos e baratos, e admite quando um risco não compensa mitigar.",
          model: "claude-opus-5",
        },
      ],
    },
  },
];

export const DEFAULT_PRESET = PRESETS[0];
