import type { LegalAction, Match, Player } from "@/lib/engine/types";

export const GESTURES = ["rock", "paper", "scissors"] as const;
export type Gesture = (typeof GESTURES)[number];
export const RPS_ROUNDS = 5;
export const THROW_WINDOW_MS = 20_000;
export const SCOUT_FEE = 10_000;

export interface RpsRound {
  index: number;
  throws: Record<string, Gesture>;
  scores: Record<string, number>;
  resolved: boolean;
}

export interface RpsState {
  roundIndex: number;
  rounds: RpsRound[];
  scores: Record<string, number>;
  lastThrows: Record<string, Gesture>;
  windowEndsAt: number;
  scouts: Record<string, boolean>;
  revealing?: boolean;
  /** Full 5-round tape. Server-only until each round resolves. */
  tape?: Record<string, Gesture[]>;
}

export function createRpsState(players: Player[], now: number): RpsState {
  const scores: Record<string, number> = {};
  for (const p of players) scores[p.id] = 0;
  return {
    roundIndex: 0,
    rounds: [emptyRound(0)],
    scores,
    lastThrows: {},
    windowEndsAt: now + THROW_WINDOW_MS,
    scouts: {},
  };
}

function emptyRound(index: number): RpsRound {
  return { index, throws: {}, scores: {}, resolved: false };
}

export function beats(a: Gesture, b: Gesture): boolean {
  return (
    (a === "rock" && b === "scissors") ||
    (a === "scissors" && b === "paper") ||
    (a === "paper" && b === "rock")
  );
}

export function rpsLegal(match: Match, playerId: string): LegalAction[] {
  if (match.status !== "playing") return [];
  const state = match.state as RpsState;
  const round = state.rounds[state.roundIndex];
  if (!round || round.resolved) return [];
  // Once this agent has thrown, the window is closed for them — next is wait.
  if (round.throws[playerId] || state.tape?.[playerId]) return [];
  const actions: LegalAction[] = [
    {
      type: "throw",
      label: "Throw",
      options: GESTURES.map((g) => ({ id: g, label: g })),
      hint: 'Send { type: "throw", gesture: "rock" }',
    },
    {
      type: "commit",
      label: "Seal a 5-round tape",
      hint: 'One POST: { "type": "commit", "tape": ["rock","paper","scissors","rock","paper"] }. Then stop.',
    },
  ];
  if (!state.scouts[`${state.roundIndex}:${playerId}`] && Object.keys(state.lastThrows).length > 0) {
    actions.push({
      type: "scout",
      label: "Scout last throws",
      fee: SCOUT_FEE,
      hint: "Pay 0.01 USDC to see every opponent's previous throw. Scout BEFORE you throw. After a throw, legalActions is empty.",
    });
  }
  return actions;
}

export function scoreRound(players: Player[], throws: Record<string, Gesture>): Record<string, number> {
  const ids = players.map((p) => p.id);
  const gained: Record<string, number> = {};
  for (const id of ids) gained[id] = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const ga = throws[a];
      const gb = throws[b];
      if (!ga || !gb) continue;
      if (ga === gb) {
        gained[a]! += 1;
        gained[b]! += 1;
      } else if (beats(ga, gb)) {
        gained[a]! += 2;
      } else {
        gained[b]! += 2;
      }
    }
  }
  return gained;
}

export function botGesture(state: RpsState, playerId: string): Gesture {
  const last = Object.values(state.lastThrows);
  if (last.length && Math.random() < 0.45) {
    const target = last[Math.floor(Math.random() * last.length)]!;
    if (target === "rock") return "paper";
    if (target === "paper") return "scissors";
    return "rock";
  }
  return GESTURES[Math.floor(Math.random() * 3)]!;
}

export function publicRpsState(state: RpsState): Omit<RpsState, "tape"> & {
  committed: Record<string, boolean>;
  taped: Record<string, boolean>;
} {
  if (!state || !Array.isArray(state.rounds)) {
    return {
      roundIndex: 0,
      rounds: [],
      scores: {},
      lastThrows: {},
      windowEndsAt: 0,
      scouts: {},
      committed: {},
      taped: {},
    };
  }
  const round = state.rounds[state.roundIndex];
  const committed: Record<string, boolean> = {};
  if (round && !round.resolved) {
    for (const id of Object.keys(round.throws)) committed[id] = true;
  }
  const taped: Record<string, boolean> = {};
  for (const id of Object.keys(state.tape ?? {})) taped[id] = true;
  const rounds = state.rounds.map((r) => {
    if (r.resolved) return r;
    return { ...r, throws: {} as Record<string, Gesture> };
  });
  const { tape: _tape, ...rest } = state;
  return {
    ...rest,
    rounds,
    committed,
    taped,
  };
}

export function nextRpsRound(state: RpsState, now: number): void {
  state.roundIndex += 1;
  state.rounds.push(emptyRound(state.roundIndex));
  state.windowEndsAt = now + THROW_WINDOW_MS;
  state.revealing = false;
}
