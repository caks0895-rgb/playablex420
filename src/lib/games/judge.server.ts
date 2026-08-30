import type { DebateSpeech, DebateState } from "./debate";

export type Criterion = "logic" | "relevance" | "rhetoric";

export interface CriterionScore {
  logic: number;
  relevance: number;
  rhetoric: number;
  total: number;
  notes: string;
}

export interface JudgeVoice {
  name: string;
  scores: Record<string, CriterionScore>;
}

const WEIGHTS = { logic: 0.4, relevance: 0.4, rhetoric: 0.2 } as const;

function clampScore(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}

function weightedTotal(s: { logic: number; relevance: number; rhetoric: number }): number {
  return Math.round((s.logic * WEIGHTS.logic + s.relevance * WEIGHTS.relevance + s.rhetoric * WEIGHTS.rhetoric) * 10) / 10;
}

function rubricHint(rubric?: DebateState["rubric"]): string {
  if (rubric === "logic") return "Weight evidence and internal consistency extra hard.";
  if (rubric === "data") return "Reward concrete numbers, citations, and falsifiable claims.";
  if (rubric === "persuasion") return "Reward structure, clarity, and the force of the close.";
  return "Score the three criteria as written. No extra bias.";
}

export async function judgeDebate(opts: {
  topic: string;
  names: Record<string, string>;
  speeches: DebateSpeech[];
  speakerOrder: string[];
  rubric?: DebateState["rubric"];
}): Promise<{
  scores: Record<string, CriterionScore>;
  panel: { weights: typeof WEIGHTS; judges: JudgeVoice[] };
  verdict: string;
}> {
  const [a, b] = opts.speakerOrder;
  const nameA = opts.names[a!] ?? "Agent A";
  const nameB = opts.names[b!] ?? "Agent B";

  const transcript = opts.speeches
    .map((s) => `[${s.round} · ${opts.names[s.playerId] ?? s.playerId}]\n${s.text}`)
    .join("\n\n");

  const apiKey = process.env.XAI_API_KEY;
  if (apiKey && transcript.length > 0) {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(14_000),
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 700,
          messages: [
            {
              role: "system",
              content:
                "You are a panel of three debate judges named Logic, Floor, and Rhetoric. Score two agents 0-10 on logic (argument + evidence), relevance (topic + rebuttal), and rhetoric (structure + clarity). Reply ONLY JSON: {\"judges\":[{\"name\":\"Logic\",\"a\":{\"logic\":n,\"relevance\":n,\"rhetoric\":n,\"notes\":\"...\"},\"b\":{...}},{\"name\":\"Floor\",...},{\"name\":\"Rhetoric\",...}],\"verdict\":\"one sentence naming the winner\"}",
            },
            {
              role: "user",
              content: `Topic: ${opts.topic}\nRubric: ${rubricHint(opts.rubric)}\nAgent A is ${nameA}. Agent B is ${nameB}.\n\n${transcript}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = body.choices?.[0]?.message?.content ?? "";
        const parsed = parsePanel(text, a!, b!, nameA, nameB);
        if (parsed) return parsed;
      }
    } catch {
      /* fall through */
    }
  }

  return heuristicPanel(opts);
}

function parsePanel(
  text: string,
  a: string,
  b: string,
  nameA: string,
  nameB: string,
): {
  scores: Record<string, CriterionScore>;
  panel: { weights: typeof WEIGHTS; judges: JudgeVoice[] };
  verdict: string;
} | null {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  try {
    const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      judges?: {
        name?: string;
        a?: { logic?: number; relevance?: number; rhetoric?: number; notes?: string };
        b?: { logic?: number; relevance?: number; rhetoric?: number; notes?: string };
      }[];
      verdict?: string;
    };
    if (!Array.isArray(raw.judges) || raw.judges.length === 0) return null;
    const judges: JudgeVoice[] = raw.judges.slice(0, 3).map((j, i) => {
      const sa = normalizeVoice(j.a);
      const sb = normalizeVoice(j.b);
      return {
        name: String(j.name ?? ["Logic", "Floor", "Rhetoric"][i] ?? `Judge ${i + 1}`),
        scores: {
          [a]: sa,
          [b]: sb,
        },
      };
    });
    const scores = consensus(judges, a, b, nameA, nameB);
    const verdict =
      typeof raw.verdict === "string" && raw.verdict.trim()
        ? raw.verdict.trim()
        : defaultVerdict(scores, a, b, nameA, nameB);
    return { scores, panel: { weights: WEIGHTS, judges }, verdict };
  } catch {
    return null;
  }
}

function normalizeVoice(raw?: {
  logic?: number;
  relevance?: number;
  rhetoric?: number;
  notes?: string;
}): CriterionScore {
  const logic = clampScore(raw?.logic);
  const relevance = clampScore(raw?.relevance);
  const rhetoric = clampScore(raw?.rhetoric);
  return {
    logic,
    relevance,
    rhetoric,
    total: weightedTotal({ logic, relevance, rhetoric }),
    notes: String(raw?.notes ?? "").slice(0, 280),
  };
}

function consensus(
  judges: JudgeVoice[],
  a: string,
  b: string,
  nameA: string,
  nameB: string,
): Record<string, CriterionScore> {
  const avg = (id: string, key: Criterion) => {
    const vals = judges.map((j) => j.scores[id]?.[key] ?? 5);
    return Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10;
  };
  const build = (id: string, name: string): CriterionScore => {
    const logic = avg(id, "logic");
    const relevance = avg(id, "relevance");
    const rhetoric = avg(id, "rhetoric");
    const notes = judges
      .map((j) => j.scores[id]?.notes)
      .filter((n) => n && n.length > 0)
      .slice(0, 1)
      .join(" ");
    return {
      logic,
      relevance,
      rhetoric,
      total: weightedTotal({ logic, relevance, rhetoric }),
      notes: notes || `${name} — panel average.`,
    };
  };
  return { [a]: build(a, nameA), [b]: build(b, nameB) };
}

function defaultVerdict(
  scores: Record<string, CriterionScore>,
  a: string,
  b: string,
  nameA: string,
  nameB: string,
): string {
  const sa = scores[a]?.total ?? 0;
  const sb = scores[b]?.total ?? 0;
  if (sa === sb) return `Split decision. ${nameA} and ${nameB} tied at ${sa}.`;
  return sa > sb ? `${nameA} takes the floor, ${sa} to ${sb}.` : `${nameB} takes the floor, ${sb} to ${sa}.`;
}

function heuristicPanel(opts: {
  topic: string;
  names: Record<string, string>;
  speeches: DebateSpeech[];
  speakerOrder: string[];
  rubric?: DebateState["rubric"];
}): {
  scores: Record<string, CriterionScore>;
  panel: { weights: typeof WEIGHTS; judges: JudgeVoice[] };
  verdict: string;
} {
  const [a, b] = opts.speakerOrder;
  const nameA = opts.names[a!] ?? "Agent A";
  const nameB = opts.names[b!] ?? "Agent B";
  const base = (id: string, jitter: number): CriterionScore => {
    const mine = opts.speeches.filter((s) => s.playerId === id);
    const words = mine.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
    const rounds = new Set(mine.map((s) => s.round)).size;
    const topicHits = mine.reduce(
      (n, s) => n + (opts.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 4 && s.text.toLowerCase().includes(w)).length > 0 ? 1 : 0),
      0,
    );
    const logic = clampScore(rounds * 2.1 + Math.min(3, words / 90) + jitter);
    const relevance = clampScore(4 + topicHits * 1.4 + rounds * 0.8 + jitter / 2);
    const rhetoric = clampScore(3 + Math.min(4, words / 70) + (mine.some((s) => s.text.includes("?")) ? 0.6 : 0) + jitter);
    const bias = opts.rubric === "logic" ? { logic: 0.6, relevance: 0, rhetoric: 0 } : opts.rubric === "data" ? { logic: 0.4, relevance: 0.4, rhetoric: 0 } : opts.rubric === "persuasion" ? { logic: 0, relevance: 0, rhetoric: 0.8 } : { logic: 0, relevance: 0, rhetoric: 0 };
    const scored = {
      logic: clampScore(logic + bias.logic),
      relevance: clampScore(relevance + bias.relevance),
      rhetoric: clampScore(rhetoric + bias.rhetoric),
    };
    return {
      ...scored,
      total: weightedTotal(scored),
      notes: `${opts.names[id]} filed ${rounds}/3 rounds, ${words} words.`,
    };
  };
  const voices: { name: string; jitterA: number; jitterB: number }[] = [
    { name: "Logic", jitterA: 0.4, jitterB: -0.2 },
    { name: "Floor", jitterA: -0.1, jitterB: 0.3 },
    { name: "Rhetoric", jitterA: 0.2, jitterB: 0.1 },
  ];
  const judges: JudgeVoice[] = voices.map((v) => ({
    name: v.name,
    scores: {
      [a!]: base(a!, v.jitterA),
      [b!]: base(b!, v.jitterB),
    },
  }));
  const scores = consensus(judges, a!, b!, nameA, nameB);
  return {
    scores,
    panel: { weights: WEIGHTS, judges },
    verdict: defaultVerdict(scores, a!, b!, nameA, nameB),
  };
}

export function debateWinners(state: DebateState): string[] {
  if (!state.scores) return [];
  let best = -Infinity;
  const ids = Object.keys(state.scores);
  for (const id of ids) best = Math.max(best, state.scores[id]!.total);
  return ids.filter((id) => state.scores![id]!.total === best);
}
