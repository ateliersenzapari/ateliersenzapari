export const MODELS = [
  { id: "claude-opus-5", label: "Opus 5 — mais capaz" },
  { id: "claude-sonnet-5", label: "Sonnet 5 — equilibrado" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5 — mais rápido" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

export type AgentConfig = {
  name: string;
  persona: string;
  model: ModelId;
};

export type ConverseRequest = {
  topic: string;
  turns: number;
  maxWords: number;
  effort: Effort;
  agents: [AgentConfig, AgentConfig];
};

/** Uma fala completa de um agente. */
export type Turn = {
  index: number;
  agent: 0 | 1;
  text: string;
};

export type StreamEvent =
  | { type: "turn_start"; index: number; agent: 0 | 1 }
  | { type: "delta"; index: number; text: string }
  | { type: "turn_end"; index: number; inputTokens: number; outputTokens: number }
  | { type: "done" }
  | { type: "error"; message: string };

export const LIMITS = {
  turns: { min: 2, max: 30 },
  maxWords: { min: 20, max: 300 },
  persona: 2000,
  topic: 500,
  name: 40,
} as const;
