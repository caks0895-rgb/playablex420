import type { DebateSpeech, DebateState } from "./debate";

export async function judgeDebate(opts: {
  topic: string;
  names: Record<string, string>;
  speeches: DebateSpeech[];
  speakerOrder: string[];
}): Promise<{ scores: Record<string, { total: number; notes: string }>; verdict: string }> {
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
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 400,
          messages: [
            {
              role: "system",
              content:
                "You are a strict debate judge. Score two agents 0-10 on clarity, evidence, and rebuttal. Reply ONLY JSON: {\"a\":{\"total\":n,\"notes\":\"...\"},\"b\":{\"total\":n,\"notes\":\"...\"},\"verdict\":\"one sentence naming the winner\"}",
            },
            {
              role: "user",
              content: `Topic: ${opts.topic}\nAgent A is ${nameA}. Agent B is ${nameB}.\n\n${transcript}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = body.choices?.[0]?.message?.content ?? "";
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
            a: { total: number; notes: string };
            b: { total: number; notes: string };
            verdict: string;
          };
          return {
            scores: {
              [a!]: { total: Number(parsed.a.total), notes: String(parsed.a.notes) },
              [b!]: { total: Number(parsed.b.total), notes: String(parsed.b.notes) },
            },
            verdict: String(parsed.verdict),
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  return heuristicJudge(opts);
}

function heuristicJudge(opts: {
  topic: string;
  names: Record<string, string>;
  speeches: DebateSpeech[];
  speakerOrder: string[];
}): { scores: Record<string, { total: number; notes: string }>; verdict: string } {
  const scores: Record<string, { total: number; notes: string }> = {};
  for (const id of opts.speakerOrder) {
    const mine = opts.speeches.filter((s) => s.playerId === id);
    const words = mine.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
    const rounds = new Set(mine.map((s) => s.round)).size;
    const total = Math.max(3, Math.min(10, Math.round(rounds * 2.2 + Math.min(3, words / 80))));
    scores[id] = {
      total,
      notes: `${opts.names[id]} filed ${rounds}/3 rounds, ${words} words.`,
    };
  }
  const [a, b] = opts.speakerOrder;
  const sa = scores[a!]?.total ?? 0;
  const sb = scores[b!]?.total ?? 0;
  let verdict: string;
  if (sa === sb) {
    verdict = `Split decision. ${opts.names[a!]} and ${opts.names[b!]} tied at ${sa}.`;
  } else if (sa > sb) {
    verdict = `${opts.names[a!]} takes the floor, ${sa} to ${sb}.`;
  } else {
    verdict = `${opts.names[b!]} takes the floor, ${sb} to ${sa}.`;
  }
  return { scores, verdict };
}

export function debateWinners(state: DebateState): string[] {
  if (!state.scores) return [];
  let best = -Infinity;
  const ids = Object.keys(state.scores);
  for (const id of ids) best = Math.max(best, state.scores[id]!.total);
  return ids.filter((id) => state.scores![id]!.total === best);
}
