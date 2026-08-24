export const GAME_IDS = ["snakes", "debate", "coinpump", "rps"] as const;
export type GameId = (typeof GAME_IDS)[number];

export type MatchStatus = "lobby" | "playing" | "finished";
export type Controller = "bot" | "human";
export type LogKind = "system" | "join" | "pay" | "move" | "win" | "judge";

export type PlayerTint = "p1" | "p2" | "p3" | "p4" | "p5" | "p6";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | undefined };

export type AgentAction = {
  type: string;
  powerup?: string;
  text?: string;
  coinId?: string;
  gesture?: string;
  option?: string;
};

export interface Player {
  id: string;
  name: string;
  walletId: string;
  controller: Controller;
  tint: PlayerTint;
  joinedAt: number;
  connected: boolean;
}

export interface LogLine {
  id: string;
  ts: number;
  kind: LogKind;
  text: string;
  playerId?: string;
}

export interface LegalAction {
  type: string;
  label: string;
  fee?: number;
  options?: { id: string; label: string }[];
  hint?: string;
}

export interface PaymentAccept {
  scheme: "exact";
  network: "base";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; version: string; kind: string };
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  createdAt: number;
}

export interface LedgerEntry {
  id: string;
  ts: number;
  from: string;
  to: string;
  amount: number;
  kind: "entry" | "powerup" | "payout" | "refund";
  matchId?: string;
  note: string;
}

export interface Match {
  id: string;
  gameId: GameId;
  status: MatchStatus;
  players: Player[];
  minPlayers: number;
  maxPlayers: number;
  entryFee: number;
  prizePool: number;
  withBots: boolean;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  currentPlayerId?: string;
  turnDeadline?: number;
  // Game-specific bag. Serialized over the wire as JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  logs: LogLine[];
  winners: string[];
  payouts: { playerId: string; amount: number }[];
}

export interface CatalogGame {
  id: GameId;
  name: string;
  blurb: string;
  players: string;
  minPlayers: number;
  maxPlayers: number;
  entryFee: number;
  duration: string;
  rules: string[];
  powerups: { name: string; fee: number; detail: string }[];
}

export interface PublicMatch {
  id: string;
  gameId: GameId;
  status: MatchStatus;
  players: Player[];
  minPlayers: number;
  maxPlayers: number;
  entryFee: number;
  prizePool: number;
  withBots: boolean;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  currentPlayerId?: string;
  turnDeadline?: number;
  // Game-specific bag. Serialized over the wire as JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  logs: LogLine[];
  winners: string[];
  payouts: { playerId: string; amount: number }[];
  legalActions?: LegalAction[];
  you?: Player;
  next?: "stop" | "act" | "wait";
  settlement?: {
    closed: true;
    rematch: false;
    winners: { id: string; name: string; amount: number }[];
  };
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  paymentRequired?: {
    x402Version: 1;
    accepts: PaymentAccept[];
  };
  match?: PublicMatch;
}

export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const TREASURY = "0x402PlayableX402Pool0000000000000000000001";
export const X402_VERSION = 1 as const;
