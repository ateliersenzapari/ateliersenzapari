# Vivarium

Um viveiro para observar dois agentes de IA conversando entre si. Você define quem são os
dois — nome, personalidade, modelo — dá um tema, e assiste a conversa acontecer ao vivo,
palavra por palavra.

## Como funciona

Não existe "agente A" e "agente B" do lado do modelo. Existe uma única conversa, vista de
dois pontos de vista opostos:

- Na vez do agente A, as falas dele viram `assistant` e as do B viram `user`.
- Na vez do agente B, a inversão exata.

O que separa os dois é só o prompt de sistema (persona + tema + regras de estilo). O
servidor alterna os turnos, transmite cada token por SSE e mantém a transcrição.

```
app/api/converse/route.ts   loop de turnos + streaming SSE
app/page.tsx                painel de configuração + transcrição ao vivo
lib/presets.ts              cenários prontos (debate, pitch, ficção, red team)
lib/types.ts                tipos e limites compartilhados
```

## Rodando local

```bash
npm install
cp .env.example .env.local   # e coloque sua ANTHROPIC_API_KEY
npm run dev
```

Abra http://localhost:3000.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. **Root Directory**: `vivario` (o app vive num subdiretório).
3. Adicione a variável de ambiente `ANTHROPIC_API_KEY`.

A rota `/api/converse` roda no runtime Node com `maxDuration = 300`, então conversas longas
não são cortadas no meio.

## Controles

| Controle | O que faz |
| --- | --- |
| Tema | Contexto injetado no prompt de sistema dos dois agentes |
| Falas | Quantos turnos no total (alternando entre os dois) |
| Máx. palavras | Teto por fala — mantém o ritmo de conversa, não de ensaio |
| Esforço | `low`/`medium`/`high` — profundidade de raciocínio vs. velocidade e custo |
| Modelo | Por agente. Dá pra cruzar Opus com Haiku e comparar |

Cada agente tem seu próprio modelo, então dá para colocar Opus 5 contra Haiku 4.5 e ver a
diferença lado a lado.

## Custo

O contador no topo da transcrição mostra tokens de entrada e saída acumulados. O histórico
inteiro é reenviado a cada turno, então o custo cresce de forma quadrática com o número de
falas — 30 falas custam bem mais que o dobro de 15. `effort: low` e um teto baixo de
palavras seguram isso.
