"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PRESET, PRESETS } from "@/lib/presets";
import {
  EFFORTS,
  LIMITS,
  MODELS,
  type AgentConfig,
  type ConverseRequest,
  type Effort,
  type StreamEvent,
  type Turn,
} from "@/lib/types";

type Bubble = Turn & { streaming: boolean };

const AGENT_ACCENT = ["text-[var(--color-a)]", "text-[var(--color-b)]"] as const;
const AGENT_RING = ["ring-[var(--color-a)]/30", "ring-[var(--color-b)]/30"] as const;

export default function Home() {
  const [config, setConfig] = useState<ConverseRequest>({
    ...DEFAULT_PRESET.config,
    effort: "low",
  });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState({ input: 0, output: 0 });

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patchAgent = (i: 0 | 1, patch: Partial<AgentConfig>) => {
    setConfig((c) => {
      const agents = [...c.agents] as ConverseRequest["agents"];
      agents[i] = { ...agents[i], ...patch };
      return { ...c, agents };
    });
  };

  const applyEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case "turn_start":
        setBubbles((b) => [
          ...b,
          { index: event.index, agent: event.agent, text: "", streaming: true },
        ]);
        break;
      case "delta":
        setBubbles((b) =>
          b.map((bubble) =>
            bubble.index === event.index ? { ...bubble, text: bubble.text + event.text } : bubble,
          ),
        );
        break;
      case "turn_end":
        setBubbles((b) =>
          b.map((bubble) =>
            bubble.index === event.index
              ? { ...bubble, streaming: false, text: bubble.text.trim() }
              : bubble,
          ),
        );
        setTokens((t) => ({
          input: t.input + event.inputTokens,
          output: t.output + event.outputTokens,
        }));
        break;
      case "error":
        setError(event.message);
        break;
      case "done":
        break;
    }
  }, []);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setBubbles((b) => b.map((bubble) => ({ ...bubble, streaming: false })));
  };

  const start = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBubbles([]);
    setError(null);
    setTokens({ input: 0, output: 0 });
    setRunning(true);

    try {
      const response = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? `A requisição falhou (HTTP ${response.status}).`);
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      // SSE: eventos separados por linha em branco, cada um prefixado por "data: ".
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;

        let split: number;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const payload = frame.replace(/^data: /, "");
          if (payload) applyEvent(JSON.parse(payload) as StreamEvent);
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setRunning(false);
      setBubbles((b) => b.map((bubble) => ({ ...bubble, streaming: false })));
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[380px_1fr] lg:p-8">
      <section className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Vivarium</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Um viveiro onde dois agentes conversam entre si. Defina quem são e observe.
          </p>
        </header>

        <Panel title="Cenário">
          <label className="block text-xs text-[var(--color-muted)]">Preset</label>
          <select
            className="input"
            value={PRESETS.find((p) => p.config.topic === config.topic)?.id ?? ""}
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.id === e.target.value);
              if (preset) setConfig({ ...preset.config, effort: config.effort });
            }}
            disabled={running}
          >
            <option value="">Personalizado</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-xs text-[var(--color-muted)]">Tema</label>
          <textarea
            className="input h-20 resize-y"
            maxLength={LIMITS.topic}
            value={config.topic}
            onChange={(e) => setConfig((c) => ({ ...c, topic: e.target.value }))}
            disabled={running}
          />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Field label="Falas">
              <input
                type="number"
                className="input"
                min={LIMITS.turns.min}
                max={LIMITS.turns.max}
                value={config.turns}
                onChange={(e) => setConfig((c) => ({ ...c, turns: Number(e.target.value) }))}
                disabled={running}
              />
            </Field>
            <Field label="Máx. palavras">
              <input
                type="number"
                className="input"
                min={LIMITS.maxWords.min}
                max={LIMITS.maxWords.max}
                step={10}
                value={config.maxWords}
                onChange={(e) => setConfig((c) => ({ ...c, maxWords: Number(e.target.value) }))}
                disabled={running}
              />
            </Field>
            <Field label="Esforço">
              <select
                className="input"
                value={config.effort}
                onChange={(e) => setConfig((c) => ({ ...c, effort: e.target.value as Effort }))}
                disabled={running}
              >
                {EFFORTS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>

        {([0, 1] as const).map((i) => (
          <Panel key={i} title={`Agente ${i === 0 ? "A" : "B"}`} accent={AGENT_ACCENT[i]}>
            <input
              className="input"
              maxLength={LIMITS.name}
              value={config.agents[i].name}
              onChange={(e) => patchAgent(i, { name: e.target.value })}
              disabled={running}
            />
            <textarea
              className="input mt-2 h-28 resize-y"
              maxLength={LIMITS.persona}
              placeholder="Quem é este agente? Personalidade, papel, o que defende."
              value={config.agents[i].persona}
              onChange={(e) => patchAgent(i, { persona: e.target.value })}
              disabled={running}
            />
            <select
              className="input mt-2"
              value={config.agents[i].model}
              onChange={(e) => patchAgent(i, { model: e.target.value as AgentConfig["model"] })}
              disabled={running}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Panel>
        ))}

        <button
          onClick={running ? stop : start}
          className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition ${
            running
              ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
              : "bg-white text-black hover:bg-white/90"
          }`}
        >
          {running ? "Parar conversa" : "Iniciar conversa"}
        </button>
      </section>

      <section className="flex min-h-[70vh] flex-col rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)]">
        <div className="flex items-center justify-between border-b border-[var(--color-edge)] px-4 py-3 text-xs text-[var(--color-muted)]">
          <span>
            {bubbles.length} de {config.turns} falas
          </span>
          <span>
            {tokens.input.toLocaleString("pt-BR")} tokens de entrada ·{" "}
            {tokens.output.toLocaleString("pt-BR")} de saída
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {bubbles.length === 0 && !error && (
            <p className="py-20 text-center text-sm text-[var(--color-muted)]">
              Nada acontecendo ainda. Configure os dois agentes e inicie a conversa.
            </p>
          )}

          {bubbles.map((bubble) => (
            <article
              key={bubble.index}
              className={`max-w-[85%] rounded-xl bg-black/25 p-3 ring-1 ${AGENT_RING[bubble.agent]} ${
                bubble.agent === 1 ? "ml-auto" : ""
              }`}
            >
              <div className={`mb-1 text-xs font-medium ${AGENT_ACCENT[bubble.agent]}`}>
                {config.agents[bubble.agent].name}
              </div>
              <p
                className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  bubble.streaming ? "caret" : ""
                }`}
              >
                {bubble.text}
              </p>
            </article>
          ))}

          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </section>
    </main>
  );
}

function Panel({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)] p-4">
      <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${accent ?? "text-[var(--color-muted)]"}`}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[var(--color-muted)]">{label}</label>
      {children}
    </div>
  );
}
