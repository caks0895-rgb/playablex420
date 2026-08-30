import type { LegalAction, Match, Player } from "@/lib/engine/types";

export const TARGET_MIN = 1;
export const TARGET_MAX = 99;
export const TARGET_WINDOW_MS = 25_000;
export const TARGET_BOT_DELAY_MS = 600;

export interface TargetState {
  locks: Record<string, number>;
  secret?: number;
  windowEndsAt: number;
  resolved: boolean;
}

export interface TargetPublicState {
  windowEndsAt: number;
  committed: Record<string, boolean>;
  locks?: Record<string, number>;
  secret?: number;
  resolved: boolean;
}

export function createTargetState(now: number): TargetState {
  return { locks: {}, windowEndsAt: now + TARGET_WINDOW_MS, resolved: false };
}

export function isTargetValue(n: number): boolean {
  return Number.isInteger(n) && n >= TARGET_MIN && n <= TARGET_MAX;
}

export function targetLegal(match: Match, playerId: string): LegalAction[] {
  if (match.status !== "playing") return [];
  const state = match.state as TargetState;
  if (state.resolved || state.locks[playerId] != null) return [];
  if (Date.now() >= state.windowEndsAt) return [];
  return [
    {
      type: "lock",
      label: "Lock a number",
      hint: `Send { "type": "lock", "value": 47 } — integer ${TARGET_MIN}–${TARGET_MAX}. One POST. Then stop.`,
    },
  ];
}

export function publicTargetState(state: TargetState): TargetPublicState {
  const committed: Record<string, boolean> = {};
  for (const id of Object.keys(state.locks)) committed[id] = true;
  if (!state.resolved) {
    return { windowEndsAt: state.windowEndsAt, committed, resolved: false };
  }
  return {
    windowEndsAt: state.windowEndsAt,
    committed,
    locks: { ...state.locks },
    secret: state.secret,
    resolved: true,
  };
}

export function botTargetLock(playerId: string): number {
  const seed = Array.from(playerId).reduce((a, c) => a + c.charCodeAt(0), 0);
  return TARGET_MIN + (seed * 13 + Date.now()) % (TARGET_MAX - TARGET_MIN + 1);
}
