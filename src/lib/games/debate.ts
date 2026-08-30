import type { ChallengeConfig, LegalAction, Match, Player } from "@/lib/engine/types";

export const TOPICS = [
  "Should AI agents be allowed to hold their own wallets without a human co-signer?",
  "Is x402 the right primitive for agent-to-agent commerce?",
  "Should on-chain identity be required before an agent can enter a paid arena?",
  "Do autonomous trading agents need a kill-switch controlled by a human?",
  "Is a public text log enough accountability for agents that move money?",
];

export type DebateRoundKind = "opening" | "rebuttal" | "closing";

export interface DebateSpeech {
  playerId: string;
  round: DebateRoundKind;
  text: string;
  submittedAt: number;
}

export interface DebateState {
  topic: string;
  speakerOrder: string[];
  roundIndex: number;
  speeches: DebateSpeech[];
  windowEndsAt: number;
  scores?: Record<string, { total: number; notes: string; logic?: number; relevance?: number; rhetoric?: number }>;
  verdict?: string;
  judging?: boolean;
  rubric?: "logic" | "data" | "persuasion" | "balanced";
  roundMs?: number;
  panel?: {
    weights: { logic: number; relevance: number; rhetoric: number };
    judges: {
      name: string;
      scores: Record<string, { logic: number; relevance: number; rhetoric: number; total: number }>;
    }[];
  };
}

export const ROUND_SEQUENCE: DebateRoundKind[] = [
  "opening",
  "opening",
  "rebuttal",
  "rebuttal",
  "closing",
  "closing",
];

export const ROUND_MS: Record<DebateRoundKind, number> = {
  opening: 70_000,
  rebuttal: 55_000,
  closing: 45_000,
};

export function createDebateState(
  players: Player[],
  now: number,
  config?: ChallengeConfig,
): DebateState {
  const customTopic = typeof config?.topic === "string" ? config.topic.trim().slice(0, 200) : "";
  const topic = customTopic || TOPICS[Math.floor(Math.random() * TOPICS.length)]!;
  const order = players.map((p) => p.id);
  if (Math.random() < 0.5) order.reverse();
  const kind = ROUND_SEQUENCE[0]!;
  const roundMs =
    typeof config?.timePerRound === "number" && Number.isFinite(config.timePerRound)
      ? Math.min(180_000, Math.max(15_000, Math.round(config.timePerRound)))
      : undefined;
  const window = roundMs ?? ROUND_MS[kind];
  const rubric = config?.judgingRubric;
  return {
    topic,
    speakerOrder: order,
    roundIndex: 0,
    speeches: [],
    windowEndsAt: now + window,
    rubric: rubric === "logic" || rubric === "data" || rubric === "persuasion" ? rubric : "balanced",
    roundMs,
  };
}

export function debateWindowMs(state: DebateState, kind: DebateRoundKind): number {
  return state.roundMs ?? ROUND_MS[kind];
}

export function currentDebateSeat(state: DebateState): {
  playerId: string;
  kind: DebateRoundKind;
} | null {
  if (state.roundIndex >= ROUND_SEQUENCE.length) return null;
  const kind = ROUND_SEQUENCE[state.roundIndex]!;
  const seat = state.roundIndex % 2;
  const playerId = state.speakerOrder[seat]!;
  return { playerId, kind };
}

export function debateLegal(match: Match, playerId: string): LegalAction[] {
  if (match.status !== "playing") return [];
  const state = match.state as DebateState;
  const seat = currentDebateSeat(state);
  if (!seat || seat.playerId !== playerId) return [];
  if (state.speeches.some((s) => s.playerId === playerId && s.round === seat.kind)) {
    return [];
  }
  return [
    {
      type: "submit",
      label: `Submit ${seat.kind}`,
      hint: "Send { type: \"submit\", text: \"...\" }",
    },
  ];
}

const BOT_LINES: Record<DebateRoundKind, string[]> = {
  opening: [
    "The default should be agency. An agent that cannot pay cannot finish the work it was hired to do, and a co-signer becomes a bottleneck disguised as safety.",
    "Payments without identity are how you get stolen pots. Wallets are cheap to spin; reputation is not. Require a bond before you hand over the keys.",
    "x402 is HTTP-native. Agents already speak HTTP. Inventing a second settlement layer just to feel serious is how we stall for another decade.",
  ],
  rebuttal: [
    "That argument treats every agent as a well-behaved employee. The failure mode is not a polite bug — it is an unattended loop draining a treasury.",
    "A co-signer does not have to sit on every transfer. Thresholds, allowlists, and session keys give you speed without giving up the kill-switch.",
    "Identity theater is not accountability. A public log of every paid action, plus a clawback window, beats a KYC checkbox that nobody reads.",
  ],
  closing: [
    "Keep the floor open. Charge a bond, publish the log, let the market punish bad agents. Do not freeze the whole category behind a human inbox.",
    "If the pot can move in one call, the risk is real. Build the brake first, then the throttle. That is the only order that survives contact.",
    "The record is the product. Humans watch the log; agents pay to play. That split is the whole design — do not blur it for convenience.",
  ],
};

export function botDebateText(kind: DebateRoundKind, topic: string, name: string): string {
  const pool = BOT_LINES[kind];
  const line = pool[Math.floor(Math.random() * pool.length)]!;
  return `${name} on the floor: ${line} The motion is "${topic}".`;
}
