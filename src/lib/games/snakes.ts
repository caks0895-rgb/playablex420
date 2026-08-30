import type { LegalAction, Match, Player } from "@/lib/engine/types";

export const BOARD_SIZE = 100;

/** Start square → end square. Ladders climb, snakes fall. */
export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 99,
};

export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

export const REROLL_FEE = 20_000;
export const WARD_FEE = 30_000;
export const SNAKES_TURN_MS = 24_000;
export const SNAKES_BOT_DELAY_MS = 500;

export interface SnakesPlayerState {
  position: number;
}

export interface SnakesState {
  pieces: Record<string, SnakesPlayerState>;
  turnIndex: number;
  lastRoll?: { playerId: string; die: number; from: number; to: number };
  /** Player asked the table to roll for them until the match ends. */
  pilots?: Record<string, true>;
}

export function createSnakesState(players: Player[]): SnakesState {
  const pieces: Record<string, SnakesPlayerState> = {};
  for (const p of players) pieces[p.id] = { position: 0 };
  return { pieces, turnIndex: 0 };
}

export function snakesLegal(match: Match, playerId: string): LegalAction[] {
  if (match.status !== "playing") return [];
  const state = match.state as SnakesState;
  const actions: LegalAction[] = [];
  if (!state.pilots?.[playerId]) {
    actions.push({
      type: "pilot",
      label: "Pilot — table rolls for you",
      hint: 'Send { "type": "pilot" } once. The table rolls every seat of yours. Safe when the chat will close.',
    });
  }
  if (match.currentPlayerId !== playerId || state.pilots?.[playerId]) return actions;
  actions.push(
    { type: "roll", label: "Roll", hint: 'Send { "type": "roll" }' },
    {
      type: "reroll",
      label: "Re-roll (keep higher)",
      fee: REROLL_FEE,
      hint: 'Send { "type": "roll", "powerup": "reroll" } or { "type": "reroll" }',
    },
    {
      type: "ward",
      label: "Snake ward",
      fee: WARD_FEE,
      hint: 'Send { "type": "roll", "powerup": "ward" } or { "type": "ward" }',
    },
  );
  return actions;
}

function applyDie(from: number, die: number): number {
  let dest = from + die;
  if (dest > BOARD_SIZE) {
    dest = BOARD_SIZE - (dest - BOARD_SIZE);
  }
  return dest;
}

export interface SnakesResolve {
  die: number;
  from: number;
  landed: number;
  to: number;
  via: "snake" | "ladder" | "none";
  bounced: boolean;
  won: boolean;
  logs: string[];
}

export function resolveSnakesTurn(opts: {
  name: string;
  from: number;
  powerup?: "reroll" | "ward";
}): SnakesResolve {
  const d1 = 1 + Math.floor(Math.random() * 6);
  let die = d1;
  const logs: string[] = [];

  if (opts.powerup === "reroll") {
    const d2 = 1 + Math.floor(Math.random() * 6);
    die = Math.max(d1, d2);
    logs.push(
      `${opts.name} paid 0.02 USDC for a re-roll: ${d1} and ${d2}, keeping ${die}.`,
    );
  }

  const raw = opts.from + die;
  const bounced = raw > BOARD_SIZE;
  const landed = applyDie(opts.from, die);

  let to = landed;
  let via: "snake" | "ladder" | "none" = "none";

  if (opts.powerup === "ward" && SNAKES[landed]) {
    logs.push(
      `${opts.name} paid 0.03 USDC for a snake ward, rolled ${die} and landed on ${landed}. The snake was ignored.`,
    );
  } else if (SNAKES[landed]) {
    to = SNAKES[landed]!;
    via = "snake";
    logs.push(
      `${opts.name} rolled ${die} and landed on a snake at ${landed}, falling to ${to}.`,
    );
  } else if (LADDERS[landed]) {
    to = LADDERS[landed]!;
    via = "ladder";
    logs.push(
      `${opts.name} rolled ${die} and climbed the ladder at ${landed}, rising to ${to}.`,
    );
  } else if (bounced) {
    logs.push(
      `${opts.name} rolled ${die} from ${opts.from}, overshot 100 and bounced to ${landed}.`,
    );
  } else if (opts.from === 0) {
    logs.push(`${opts.name} rolled ${die} and entered the board at ${landed}.`);
  } else {
    logs.push(`${opts.name} rolled ${die} and moved from ${opts.from} to ${landed}.`);
  }

  const won = to === BOARD_SIZE;
  if (won) {
    logs.push(`${opts.name} landed on 100 and won the table.`);
  }

  return { die, from: opts.from, landed, to, via, bounced, won, logs };
}

export function snakesBotPowerup(state: SnakesState, playerId: string): "reroll" | "ward" | undefined {
  const pos = state.pieces[playerId]?.position ?? 0;
  let snakeAhead = false;
  for (let i = 1; i <= 6; i++) {
    const sq = pos + i;
    if (SNAKES[sq]) snakeAhead = true;
  }
  if (snakeAhead && Math.random() < 0.55) return "ward";
  if (pos > 85 && Math.random() < 0.35) return "reroll";
  if (Math.random() < 0.08) return "reroll";
  return undefined;
}

export function squareToCell(n: number): { row: number; col: number } {
  if (n <= 0) return { row: 10, col: 0 };
  const idx = n - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const colInRow = idx % 10;
  const col = rowFromBottom % 2 === 1 ? 9 - colInRow : colInRow;
  const row = 9 - rowFromBottom;
  return { row, col };
}
