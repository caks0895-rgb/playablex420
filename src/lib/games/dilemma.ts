import type { LegalAction, Match, Player } from "@/lib/engine/types";

export const DILEMMA_MOVES = ["cooperate", "defect"] as const;
export type DilemmaMove = (typeof DILEMMA_MOVES)[number];
export const DILEMMA_ROUNDS = 5;
export const CHOOSE_WINDOW_MS = 20_000;
export const DILEMMA_BOT_DELAY_MS = 700;

export interface DilemmaRound {
  index: number;
  /** Server-only until the round resolves. Never copy this field onto the wire. */
  sealed: Record<string, DilemmaMove>;
  scores: Record<string, number>;
  resolved: boolean;
}

export interface DilemmaState {
  roundIndex: number;
  rounds: DilemmaRound[];
  scores: Record<string, number>;
  windowEndsAt: number;
  revealing?: boolean;
  /** Full 5-round tape. Server-only. */
  tape?: Record<string, DilemmaMove[]>;
}

/** What agents and the watch page are allowed to see. */
export interface DilemmaPublicState {
  roundIndex: number;
  scores: Record<string, number>;
  windowEndsAt: number;
  committed: Record<string, boolean>;
  taped?: Record<string, boolean>;
  history: { index: number; moves: Record<string, DilemmaMove>; scores: Record<string, number> }[];
  revealing?: boolean;
}

export function createDilemmaState(players: Player[], now: number): DilemmaState {
  const scores: Record<string, number> = {};
  for (const p of players) scores[p.id] = 0;
  return {
    roundIndex: 0,
    rounds: [emptyRound(0)],
    scores,
    windowEndsAt: now + CHOOSE_WINDOW_MS,
  };
}

function emptyRound(index: number): DilemmaRound {
  return { index, sealed: {}, scores: {}, resolved: false };
}

export function isDilemmaMove(value: string): value is DilemmaMove {
  return (DILEMMA_MOVES as readonly string[]).includes(value);
}

/** Classic 2x2. Both C → 3/3. Both D → 1/1. D vs C → 5/0. */
export function payoff(a: DilemmaMove, b: DilemmaMove): [number, number] {
  if (a === "cooperate" && b === "cooperate") return [3, 3];
  if (a === "defect" && b === "defect") return [1, 1];
  if (a === "defect" && b === "cooperate") return [5, 0];
  return [0, 5];
}

export function dilemmaLegal(match: Match, playerId: string): LegalAction[] {
  if (match.status !== "playing") return [];
  const state = match.state as DilemmaState;
  const round = state.rounds[state.roundIndex];
  if (!round || round.resolved) return [];
  if (round.sealed[playerId] || state.tape?.[playerId]) return [];
  return [
    {
      type: "choose",
      label: "Choose",
      options: [
        { id: "cooperate", label: "Cooperate" },
        { id: "defect", label: "Defect" },
      ],
      hint: 'Send { "type": "choose", "move": "cooperate" } or "defect". The choice stays sealed until both envelopes open.',
    },
    {
      type: "commit",
      label: "Seal a 5-round tape",
      hint: 'One POST: { "type": "commit", "tape": ["cooperate","defect","cooperate","defect","cooperate"] }. Then stop.',
    },
  ];
}

export function nextDilemmaRound(state: DilemmaState, now: number): void {
  state.roundIndex += 1;
  state.rounds.push(emptyRound(state.roundIndex));
  state.windowEndsAt = now + CHOOSE_WINDOW_MS;
  state.revealing = false;
}

export function lastOpponentMove(state: DilemmaState, playerId: string, players: Player[]): DilemmaMove | undefined {
  const other = players.find((p) => p.id !== playerId);
  if (!other) return undefined;
  for (let i = state.roundIndex - 1; i >= 0; i--) {
    const round = state.rounds[i];
    if (round?.resolved && round.sealed[other.id]) return round.sealed[other.id];
  }
  return undefined;
}

/** Tit-for-tat with a little noise. First round cooperates. */
export function botDilemmaMove(state: DilemmaState, playerId: string, players: Player[]): DilemmaMove {
  const prior = lastOpponentMove(state, playerId, players);
  if (!prior) return Math.random() < 0.85 ? "cooperate" : "defect";
  if (Math.random() < 0.12) return prior === "cooperate" ? "defect" : "cooperate";
  return prior;
}

/**
 * Strip sealed envelopes. Committed flags only. History is resolved rounds.
 * `agentId` is unauthenticated — never reveal a sealed move to anyone over GET.
 */
export function publicDilemmaState(state: DilemmaState): DilemmaPublicState {
  if (!state || !Array.isArray(state.rounds)) {
    return {
      roundIndex: 0,
      scores: {},
      windowEndsAt: 0,
      committed: {},
      taped: {},
      history: [],
    };
  }
  const round = state.rounds[state.roundIndex];
  const committed: Record<string, boolean> = {};
  if (round && !round.resolved) {
    for (const id of Object.keys(round.sealed)) committed[id] = true;
  }
  const taped: Record<string, boolean> = {};
  for (const id of Object.keys(state.tape ?? {})) taped[id] = true;
  const history = state.rounds
    .filter((r) => r.resolved)
    .map((r) => ({ index: r.index, moves: { ...r.sealed }, scores: { ...r.scores } }));
  return {
    roundIndex: state.roundIndex,
    scores: { ...state.scores },
    windowEndsAt: state.windowEndsAt,
    committed,
    taped,
    history,
    revealing: state.revealing,
  };
}
