export const GAME_IDS = ["snakes", "debate", "coinpump", "rps", "dilemma", "target"] as const;
export type GameId = (typeof GAME_IDS)[number];
export const GAME_ID_LIST = GAME_IDS.join(", ");

export type MatchStatus = "lobby" | "playing" | "finished";
export type Controller = "bot" | "human";
export type LogKind = "system" | "join" | "pay" | "move" | "win" | "judge";
export type MatchKind = "table" | "challenge";
export type JudgingRubric = "logic" | "data" | "persuasion" | "balanced";

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
  move?: string;
  option?: string;
  tape?: string[];
  value?: number;
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

/** Returned once from POST /wallets. Never listed on GET. */
export interface IssuedWallet extends Wallet {
  secret: string;
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

export interface ChallengeConfig {
  topic?: string;
  judgingRubric?: JudgingRubric;
  timePerRound?: number;
  turnLimit?: number;
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
  kind?: MatchKind;
  creatorId?: string;
  minToStart?: number;
  lobbyTimeoutMs?: number;
  expiresAt?: number;
  cancelled?: boolean;
  customConfig?: ChallengeConfig;
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
  oneshot?: boolean;
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
    cancelled?: boolean;
    winners: { id: string; name: string; amount: number }[];
  };
  kind?: MatchKind;
  creatorId?: string;
  minToStart?: number;
  lobbyTimeoutMs?: number;
  expiresAt?: number;
  cancelled?: boolean;
  customConfig?: ChallengeConfig;
}

export interface ChallengeSummary {
  id: string;
  gameId: GameId;
  status: MatchStatus;
  creator?: string;
  creatorId?: string;
  entryFee: number;
  totalPot: number;
  currentPlayers: number;
  maxPlayers: number;
  minPlayers: number;
  minToStart: number;
  expiresAt?: number;
  customConfig?: ChallengeConfig;
  cancelled?: boolean;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  paymentRequired?: {
    x402Version: 1;
    accepts: PaymentAccept[];
  };
  match?: PublicMatch;
  challenge?: ChallengeSummary;
}

export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const TREASURY = "0x402PlayableX402Pool0000000000000000000001";
export const X402_VERSION = 1 as const;

/** Public agent BASE. Never a Vercel or preview origin. */
export const PUBLIC_BASE = "https://playablex420.grok.me";

/** Empty or underfilled lobbies close after this. */
export const EMPTY_LOBBY_MS = 2 * 60_000;

/** Default challenge lobby wait. */
export const CHALLENGE_LOBBY_MS = 5 * 60_000;

/** Hard clock so a playing table cannot run forever. */
export const MAX_PLAY_MS: Record<GameId, number> = {
  snakes: 12 * 60_000,
  debate: 12 * 60_000,
  coinpump: 12 * 60_000,
  rps: 3 * 60_000,
  dilemma: 3 * 60_000,
  target: 90_000,
};

export function lobbyIdleSince(match: { createdAt: number; players: { joinedAt: number }[] }): number {
  if (match.players.length === 0) return match.createdAt;
  return Math.max(match.createdAt, ...match.players.map((p) => p.joinedAt));
}

export function safeBalance(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
