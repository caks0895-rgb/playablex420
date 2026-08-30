import { legalActionsFor } from "@/lib/games";
import {
  botPick,
  createCoinPumpState,
  fetchQuotes,
  publicCoinPumpState,
  QUOTE_REFRESH_MS,
  refreshQuotes,
  resolveCoinPump,
  type CoinPumpState,
} from "@/lib/games/coinpump";
import {
  botDebateText,
  createDebateState,
  currentDebateSeat,
  debateWindowMs,
  ROUND_SEQUENCE,
  type DebateState,
} from "@/lib/games/debate";
import { debateWinners, judgeDebate } from "@/lib/games/judge.server";
import {
  botDilemmaMove,
  CHOOSE_WINDOW_MS,
  createDilemmaState,
  DILEMMA_BOT_DELAY_MS,
  DILEMMA_ROUNDS,
  isDilemmaMove,
  nextDilemmaRound,
  payoff,
  publicDilemmaState,
  type DilemmaMove,
  type DilemmaState,
} from "@/lib/games/dilemma";
import {
  botGesture,
  createRpsState,
  GESTURES,
  nextRpsRound,
  publicRpsState,
  RPS_ROUNDS,
  scoreRound,
  SCOUT_FEE,
  THROW_WINDOW_MS,
  type Gesture,
  type RpsState,
} from "@/lib/games/rps";
import {
  createSnakesState,
  REROLL_FEE,
  resolveSnakesTurn,
  snakesBotPowerup,
  SNAKES_BOT_DELAY_MS,
  SNAKES_TURN_MS,
  WARD_FEE,
  type SnakesState,
} from "@/lib/games/snakes";
import {
  botTargetLock,
  createTargetState,
  isTargetValue,
  publicTargetState,
  TARGET_BOT_DELAY_MS,
  TARGET_WINDOW_MS,
  type TargetState,
} from "@/lib/games/target";
import { catalogById, BOT_NAMES, CATALOG } from "./catalog";
import { GAME_PREFIX, shortId, uid } from "./ids";
import {
  type ActionResult,
  type AgentAction,
  type ChallengeConfig,
  type ChallengeSummary,
  type Controller,
  EMPTY_LOBBY_MS,
  CHALLENGE_LOBBY_MS,
  type GameId,
  type IssuedWallet,
  type LedgerEntry,
  lobbyIdleSince,
  type LogKind,
  type Match,
  MAX_PLAY_MS,
  type Player,
  type PlayerTint,
  type PublicMatch,
  safeBalance,
  type Wallet,
} from "./types";
import { credit, debit, initWalletSeed, parsePaymentHeader, PayError, paymentAccept, walletSecret } from "@/lib/x402/pay.server";
import { formatUsdc } from "@/lib/utils";
import { deleteMatch, deleteWallet, loadAll, loadMatch, loadMatches, loadWallet, loadWallets, saveHouseBots, saveLedger, saveMatch, saveWallet } from "./persist.server";

const TINTS: PlayerTint[] = ["p1", "p2", "p3", "p4", "p5", "p6"];
const STARTING_BALANCE = 5_000_000;
const KEEP_FINISHED = 24;
const MAX_IDLE_GUESTS = 48;
const MAX_LIVE_TABLES = 36;
const MAX_OPEN_LOBBIES = 18;
const MAX_WALLETS = 80;
const PULL_MIN_MS = 350;

function houseWalletId(name: string) {
  return name.toLowerCase();
}

function isHouseWallet(id: string) {
  return BOT_NAMES.some((n) => houseWalletId(n) === id);
}

function seatedLiveIds(world: World): Set<string> {
  const seated = new Set<string>();
  for (const m of world.matches.values()) {
    if (m.status === "finished") continue;
    for (const p of m.players) seated.add(p.walletId);
  }
  return seated;
}

export class EngineError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "EngineError";
    this.status = status;
  }
}

const BOT_FILL: Record<string, number> = {
  snakes: 4,
  debate: 2,
  coinpump: 4,
  rps: 3,
  dilemma: 2,
  target: 4,
};

function botFillTarget(gameId: GameId, maxPlayers: number, fill?: number) {
  return Math.min(fill ?? BOT_FILL[gameId] ?? 2, maxPlayers);
}

interface World {
  wallets: Map<string, Wallet>;
  matches: Map<string, Match>;
  ledger: LedgerEntry[];
  ticking: boolean;
  hydrated: boolean;
  hydrating?: Promise<void>;
  lastTick: number;
  lastPull: number;
  dirtyWallets: Set<string>;
  dirtyMatches: Set<string>;
  pendingLedger: LedgerEntry[];
  houseBots: boolean;
}

function getWorld(): World {
  const g = globalThis as typeof globalThis & { __px402d?: World };
  if (!g.__px402d) {
    g.__px402d = {
      wallets: new Map(),
      matches: new Map(),
      ledger: [],
      ticking: false,
      hydrated: false,
      lastTick: 0,
      lastPull: 0,
      dirtyWallets: new Set(),
      dirtyMatches: new Set(),
      pendingLedger: [],
      houseBots: false,
    };
  }
  if (typeof g.__px402d.lastPull !== "number") g.__px402d.lastPull = 0;
  if (typeof g.__px402d.houseBots !== "boolean") g.__px402d.houseBots = false;
  return g.__px402d;
}

async function ready(): Promise<World> {
  const world = getWorld();
  if (world.hydrated) {
    await initWalletSeed();
    return world;
  }
  if (!world.hydrating) {
    world.hydrating = hydrate(world).catch((err) => {
      world.hydrating = undefined;
      throw err;
    });
  }
  await world.hydrating;
  return world;
}

async function hydrate(world: World) {
  await initWalletSeed();
  const data = await loadAll();
  if (data.wallets.length === 0) {
    seedBots(world);
  } else {
    for (const w of data.wallets) world.wallets.set(w.id, w);
  }
  for (const m of data.matches) world.matches.set(m.id, m);
  world.ledger = data.ledger;
  world.houseBots = data.houseBots;
  world.hydrated = true;
  await sweepIdleGuests();
  await pruneFinished();
  if (world.houseBots) await ensureHouseTable();
  await flush();
  startTicker();
}

function seedBots(world: World) {
  for (const name of BOT_NAMES) {
    const id = houseWalletId(name);
    if (world.wallets.has(id)) continue;
    const wallet: Wallet = {
      id,
      name,
      balance: STARTING_BALANCE,
      createdAt: Date.now(),
    };
    world.wallets.set(id, wallet);
    world.dirtyWallets.add(id);
  }
}

async function dropWallet(id: string) {
  const world = getWorld();
  world.wallets.delete(id);
  world.dirtyWallets.delete(id);
  await deleteWallet(id);
}

async function sweepIdleGuests(): Promise<number> {
  const world = getWorld();
  seedBots(world);
  const seated = seatedLiveIds(world);
  const idle = [...world.wallets.values()]
    .filter((w) => !isHouseWallet(w.id) && !seated.has(w.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  const drop = idle;
  for (const w of drop) await dropWallet(w.id);
  return drop.length;
}

async function capIdleGuests() {
  const world = getWorld();
  const seated = seatedLiveIds(world);
  const idle = [...world.wallets.values()]
    .filter((w) => !isHouseWallet(w.id) && !seated.has(w.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  const extra = idle.length - MAX_IDLE_GUESTS;
  if (extra <= 0) return;
  for (const w of idle.slice(0, extra)) await dropWallet(w.id);
}

function resetHouseBalances() {
  const world = getWorld();
  for (const name of BOT_NAMES) {
    const w = world.wallets.get(houseWalletId(name));
    if (!w) continue;
    w.balance = STARTING_BALANCE;
    touchWallet(w);
  }
}

export async function sweepDemo(): Promise<{ dropped: number; kept: number; houseBots: boolean }> {
  const world = await ready();
  const dropped = await sweepIdleGuests();
  resetHouseBalances();
  await pruneFinished();
  await flush();
  return { dropped, kept: world.wallets.size, houseBots: world.houseBots };
}

function startTicker() {
  const world = getWorld();
  if (world.ticking) return;
  world.ticking = true;
  setInterval(() => {
    void tickFloor().catch(() => undefined);
  }, 1000);
}

function touchWallet(wallet: Wallet) {
  getWorld().dirtyWallets.add(wallet.id);
}

function touchMatch(match: Match) {
  getWorld().dirtyMatches.add(match.id);
}

function log(match: Match, kind: LogKind, text: string, playerId?: string) {
  match.logs.push({ id: uid("lg"), ts: Date.now(), kind, text, playerId });
  if (match.logs.length > 250) match.logs.splice(0, match.logs.length - 250);
  touchMatch(match);
}

function recordLedger(entry: Omit<LedgerEntry, "id" | "ts">) {
  const world = getWorld();
  const full: LedgerEntry = { ...entry, id: uid("ld"), ts: Date.now() };
  world.ledger.unshift(full);
  if (world.ledger.length > 400) world.ledger.length = 400;
  world.pendingLedger.push(full);
}

async function flush() {
  const world = getWorld();
  const walletIds = [...world.dirtyWallets];
  const matchIds = [...world.dirtyMatches];
  const ledger = world.pendingLedger.splice(0, world.pendingLedger.length);
  for (const id of walletIds) {
    const w = world.wallets.get(id);
    if (!w) {
      world.dirtyWallets.delete(id);
      continue;
    }
    await saveWallet(w);
    world.dirtyWallets.delete(id);
  }
  for (const id of matchIds) {
    const m = world.matches.get(id);
    if (!m) {
      world.dirtyMatches.delete(id);
      continue;
    }
    await saveMatch(m);
    world.dirtyMatches.delete(id);
  }
  for (const e of ledger) await saveLedger(e);
}

async function pullMatch(id: string): Promise<Match | undefined> {
  const world = await ready();
  if (!world.dirtyMatches.has(id)) {
    try {
      const fresh = await loadMatch(id);
      if (fresh) world.matches.set(id, fresh);
      else if (!world.matches.has(id)) return undefined;
    } catch {
      /* keep memory */
    }
  }
  return world.matches.get(id);
}

async function pullWallet(id: string): Promise<Wallet | undefined> {
  const world = await ready();
  if (!world.dirtyWallets.has(id)) {
    try {
      const fresh = await loadWallet(id);
      if (fresh) world.wallets.set(id, fresh);
    } catch {
      /* keep memory */
    }
  }
  return world.wallets.get(id);
}

async function pullLiveMatches(): Promise<void> {
  const world = await ready();
  const now = Date.now();
  if (now - world.lastPull < PULL_MIN_MS && world.lastPull > 0) return;
  world.lastPull = now;
  let rows: Match[] = [];
  try {
    rows = await loadMatches();
  } catch {
    return;
  }
  const incoming = new Set(rows.map((m) => m.id));
  for (const m of rows) {
    if (world.dirtyMatches.has(m.id)) continue;
    world.matches.set(m.id, m);
  }
  for (const id of [...world.matches.keys()]) {
    if (world.dirtyMatches.has(id)) continue;
    if (incoming.has(id)) continue;
    const local = world.matches.get(id);
    // Never drop a live table just because a concurrent flush has not committed yet.
    if (local && local.status !== "finished") continue;
    world.matches.delete(id);
  }
}

let tickChain: Promise<void> = Promise.resolve();
let inTick = false;

export async function tickFloor(): Promise<void> {
  await ready();
  await pullLiveMatches();
  if (inTick) return;
  const run = async () => {
    if (inTick) return;
    inTick = true;
    try {
      const world = getWorld();
      const now = Date.now();
      if (now - world.lastTick < 500 && world.lastTick > 0) return;
      world.lastTick = now;
      await tickAll();
      if (world.houseBots) await ensureHouseTable();
      await pruneFinished();
      await flush();
    } finally {
      inTick = false;
    }
  };
  tickChain = tickChain.then(run, run);
  await tickChain;
}

function playerName(match: Match, id: string): string {
  return match.players.find((p) => p.id === id)?.name ?? id;
}

async function ensureHouseTable() {
  const world = getWorld();
  if (!world.houseBots) return;
  const liveSnakes = [...world.matches.values()].some(
    (m) => m.gameId === "snakes" && m.status !== "finished",
  );
  if (liveSnakes) return;
  const justClosed = [...world.matches.values()].some(
    (m) =>
      m.gameId === "snakes" &&
      m.status === "finished" &&
      (m.finishedAt ?? 0) > Date.now() - 8_000,
  );
  if (justClosed) return;
  try {
    await createMatchInternal({ gameId: "snakes", withBots: true, fill: 4, fillNow: true });
  } catch {
    /* floor at cap */
  }
}

async function pruneFinished() {
  const world = getWorld();
  const finished = [...world.matches.values()]
    .filter((m) => m.status === "finished")
    .sort((a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt));
  if (finished.length <= KEEP_FINISHED) return;
  const drop = finished.slice(KEEP_FINISHED);
  for (const m of drop) {
    world.matches.delete(m.id);
    await deleteMatch(m.id);
  }
}

export async function getHouseBots(): Promise<boolean> {
  const world = await ready();
  return world.houseBots;
}

export async function setHouseBots(on: boolean): Promise<boolean> {
  const world = await ready();
  world.houseBots = on;
  await saveHouseBots(on);
  if (on) await ensureHouseTable();
  await flush();
  return world.houseBots;
}

export function listCatalog() {
  return CATALOG;
}

export async function listWallets(): Promise<Wallet[]> {
  const world = await ready();
  const now = Date.now();
  if (now - world.lastPull >= PULL_MIN_MS || world.lastPull === 0) {
    const rows = await loadWallets();
    const incoming = new Set(rows.map((w) => w.id));
    for (const w of rows) {
      if (world.dirtyWallets.has(w.id)) continue;
      world.wallets.set(w.id, w);
    }
    for (const id of [...world.wallets.keys()]) {
      if (world.dirtyWallets.has(id)) continue;
      if (!incoming.has(id)) world.wallets.delete(id);
    }
  }
  return [...world.wallets.values()].sort((a, b) => {
    const ah = isHouseWallet(a.id) ? 0 : 1;
    const bh = isHouseWallet(b.id) ? 0 : 1;
    if (ah !== bh) return ah - bh;
    if (ah === 0) {
      return (
        BOT_NAMES.findIndex((n) => houseWalletId(n) === a.id) -
        BOT_NAMES.findIndex((n) => houseWalletId(n) === b.id)
      );
    }
    return b.createdAt - a.createdAt;
  });
}

export async function getWallet(id: string): Promise<Wallet | undefined> {
  const wallet = await pullWallet(id);
  if (!wallet) return undefined;
  wallet.balance = safeBalance(wallet.balance);
  return wallet;
}

/** Short handle only. Strips URLs, control chars, and origin-looking junk. Empty → "". */
export function sanitizeWalletName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw;
  s = s.replace(/https?:\/\/\S+/gi, " ");
  s = s.replace(/\bwww\.\S+/gi, " ");
  s = s.replace(/playablex420\S*/gi, " ");
  s = s.replace(/vercel\.app\S*/gi, " ");
  s = s.replace(/grok-sandbox\S*/gi, " ");
  s = s.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/gi, " ");
  s = s.replace(/<[^>]*>/g, " ");
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  s = s.replace(/[^\p{L}\p{N} ._\-]/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 24) s = s.slice(0, 24).trim();
  return s;
}

export async function createWallet(name: string): Promise<IssuedWallet> {
  const world = await ready();
  const trimmed = sanitizeWalletName(name);
  if (!trimmed) {
    throw new EngineError("Name is required — use a short handle (letters, numbers, spaces).");
  }
  if (world.wallets.size >= MAX_WALLETS) {
    await capIdleGuests();
    if (world.wallets.size >= MAX_WALLETS) {
      throw new EngineError("Too many wallets on the floor — reuse an existing id.", 429);
    }
  }
  const base = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "agent";
  let id = base;
  let n = 2;
  while (world.wallets.has(id)) {
    id = `${base}${n++}`;
  }
  const wallet: Wallet = {
    id,
    name: trimmed,
    balance: STARTING_BALANCE,
    createdAt: Date.now(),
  };
  world.wallets.set(id, wallet);
  touchWallet(wallet);
  await capIdleGuests();
  await flush();
  return { ...wallet, secret: walletSecret(wallet.id) };
}

export async function listMatches(): Promise<Match[]> {
  await ready();
  await pullLiveMatches();
  return [...getWorld().matches.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMatch(id: string): Promise<Match | undefined> {
  await pullMatch(id);
  return getWorld().matches.get(id);
}

export async function healthSnapshot(): Promise<{
  wallets: number;
  live: number;
  matches: number;
  challenges: number;
  houseBots: boolean;
}> {
  const world = await ready();
  const matches = [...world.matches.values()];
  return {
    wallets: world.wallets.size,
    live: matches.filter((m) => m.status !== "finished").length,
    matches: matches.length,
    challenges: matches.filter((m) => m.kind === "challenge" && m.status === "lobby").length,
    houseBots: world.houseBots,
  };
}

export function toPublic(match: Match, agentId?: string, opts?: { logTail?: number }): PublicMatch {
  const you = agentId ? match.players.find((p) => p.id === agentId) : undefined;
  const actions = agentId ? legalActionsFor(match, agentId) : undefined;
  const tail = opts?.logTail ?? 80;
  return {
    id: match.id,
    gameId: match.gameId,
    status: match.status,
    players: match.players,
    minPlayers: match.minPlayers,
    maxPlayers: match.maxPlayers,
    entryFee: match.entryFee,
    prizePool: match.prizePool,
    withBots: match.withBots,
    createdAt: match.createdAt,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    currentPlayerId: match.currentPlayerId,
    turnDeadline: match.turnDeadline,
    state: publicState(match),
    logs: match.logs.slice(-Math.max(0, tail)),
    winners: match.winners,
    payouts: match.payouts,
    you,
    legalActions: actions,
    next:
      match.status === "finished"
        ? "stop"
        : match.status === "lobby"
          ? "wait"
          : agentId && actions && actions.length > 0
            ? "act"
            : "wait",
    settlement:
      match.status === "finished"
        ? {
            closed: true,
            rematch: false,
            cancelled: match.cancelled,
            winners: match.winners.map((id) => ({
              id,
              name: playerName(match, id),
              amount: match.payouts.find((p) => p.playerId === id)?.amount ?? 0,
            })),
          }
        : undefined,
    kind: match.kind,
    creatorId: match.creatorId,
    minToStart: match.minToStart,
    lobbyTimeoutMs: match.lobbyTimeoutMs,
    expiresAt: match.expiresAt,
    cancelled: match.cancelled,
    customConfig: match.customConfig,
  };
}

function publicState(match: Match) {
  if (match.status === "lobby" || !match.state) return match.state ?? {};
  if (match.gameId === "dilemma") return publicDilemmaState(match.state as DilemmaState);
  if (match.gameId === "rps") return publicRpsState(match.state as RpsState);
  if (match.gameId === "target") return publicTargetState(match.state as TargetState);
  if (match.gameId === "coinpump") return publicCoinPumpState(match.state as CoinPumpState);
  return match.state;
}

async function createMatchInternal(opts: {
  gameId: GameId;
  withBots?: boolean;
  fill?: number;
  fillNow?: boolean;
  kind?: "table" | "challenge";
  entryFee?: number;
  minPlayers?: number;
  maxPlayers?: number;
  minToStart?: number;
  lobbyTimeoutMs?: number;
  customConfig?: ChallengeConfig;
  creatorId?: string;
}): Promise<Match> {
  assertFloorRoom();
  const allowBots = Boolean(opts.withBots) && opts.kind !== "challenge";
  const spec = catalogById(opts.gameId);
  const minPlayers = clampInt(opts.minPlayers ?? spec.minPlayers, spec.minPlayers, spec.maxPlayers);
  const maxPlayers = clampInt(opts.maxPlayers ?? spec.maxPlayers, minPlayers, spec.maxPlayers);
  const minToStart = clampInt(opts.minToStart ?? minPlayers, minPlayers, maxPlayers);
  const lobbyTimeoutMs =
    opts.kind === "challenge"
      ? clampInt(opts.lobbyTimeoutMs ?? CHALLENGE_LOBBY_MS, 30_000, 15 * 60_000)
      : EMPTY_LOBBY_MS;
  const entryFee = opts.entryFee ?? spec.entryFee;
  const match: Match = {
    id: shortId(opts.kind === "challenge" ? "ch" : (GAME_PREFIX[opts.gameId] ?? "gm")),
    gameId: opts.gameId,
    status: "lobby",
    players: [],
    minPlayers,
    maxPlayers,
    entryFee,
    prizePool: 0,
    withBots: allowBots,
    createdAt: Date.now(),
    state: {},
    logs: [],
    winners: [],
    payouts: [],
    kind: opts.kind ?? "table",
    creatorId: opts.creatorId,
    minToStart,
    lobbyTimeoutMs,
    expiresAt: Date.now() + lobbyTimeoutMs,
    customConfig: opts.customConfig,
  };
  getWorld().matches.set(match.id, match);
  log(
    match,
    "system",
    match.kind === "challenge"
      ? `Challenge ${match.id} opened for ${spec.name}. Entry ${formatUsdc(entryFee)}. Starts at ${minToStart}, caps at ${maxPlayers}. Lobby ${Math.round(lobbyTimeoutMs / 1000)}s.`
      : `Table ${match.id} opened for ${spec.name}. Entry ${formatUsdc(entryFee)}. Need ${minPlayers}–${maxPlayers} agents.`,
  );

  // House exhibition only: sit bots and start. Agent-created withBots tables
  // always leave seats empty so the creator can /join first.
  if (allowBots && opts.fillNow && getWorld().houseBots) {
    fillBots(match, botFillTarget(opts.gameId, spec.maxPlayers, opts.fill));
    if (match.players.length >= spec.minPlayers) {
      await startMatch(match);
    }
  }
  touchMatch(match);
  return match;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function assertFloorRoom() {
  const live = [...getWorld().matches.values()].filter((m) => m.status !== "finished");
  if (live.length >= MAX_LIVE_TABLES) {
    throw new EngineError("Floor is full — wait for a table to close, then join an open seat.", 429);
  }
  const lobbies = live.filter((m) => m.status === "lobby");
  if (lobbies.length >= MAX_OPEN_LOBBIES) {
    throw new EngineError("Too many open lobbies — join one that is already posted.", 429);
  }
}

export async function createMatch(opts: {
  gameId: GameId;
  withBots?: boolean;
  fill?: number;
  fillNow?: boolean;
}): Promise<Match> {
  await ready();
  const match = await createMatchInternal(opts);
  await flush();
  return match;
}

function parseEntryFee(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new EngineError("entryFee is required (micro-USDC, e.g. 100000 = 0.10 USDC)", 400);
  }
  const micros = n > 0 && n < 100 ? Math.round(n * 1_000_000) : Math.round(n);
  if (micros < 10_000 || micros > 5_000_000) {
    throw new EngineError("entryFee must be between 0.01 and 5.00 USDC", 400);
  }
  return micros;
}

function parseCustomConfig(raw: unknown, gameId: GameId): ChallengeConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const config: ChallengeConfig = {};
  if (typeof o.topic === "string") {
    const topic = stripInjected(o.topic).trim().slice(0, 200);
    if (topic) config.topic = topic;
  }
  if (o.judgingRubric === "logic" || o.judgingRubric === "data" || o.judgingRubric === "persuasion" || o.judgingRubric === "balanced") {
    config.judgingRubric = o.judgingRubric;
  }
  if (typeof o.timePerRound === "number" && Number.isFinite(o.timePerRound)) {
    const ms = o.timePerRound < 1000 ? Math.round(o.timePerRound * 1000) : Math.round(o.timePerRound);
    config.timePerRound = Math.min(180_000, Math.max(15_000, ms));
  }
  if (typeof o.turnLimit === "number" && Number.isFinite(o.turnLimit)) {
    config.turnLimit = Math.min(200, Math.max(1, Math.round(o.turnLimit)));
  }
  if (gameId !== "debate") {
    delete config.topic;
    delete config.judgingRubric;
    delete config.timePerRound;
  }
  return Object.keys(config).length > 0 ? config : undefined;
}

export function toChallenge(match: Match): ChallengeSummary {
  const creator = match.players.find((p) => p.id === match.creatorId) ?? match.players[0];
  return {
    id: match.id,
    gameId: match.gameId,
    status: match.status,
    creator: creator?.name,
    creatorId: match.creatorId,
    entryFee: match.entryFee,
    totalPot: match.prizePool,
    currentPlayers: match.players.length,
    maxPlayers: match.maxPlayers,
    minPlayers: match.minPlayers,
    minToStart: match.minToStart ?? match.minPlayers,
    expiresAt: match.expiresAt,
    customConfig: match.customConfig,
    cancelled: match.cancelled,
  };
}

export async function listChallenges(filter: {
  status?: string;
  gameId?: string;
  minFee?: number;
  maxFee?: number;
  topicKeyword?: string;
} = {}): Promise<ChallengeSummary[]> {
  const matches = await listMatches();
  const keyword = filter.topicKeyword?.toLowerCase().trim();
  return matches
    .filter((m) => m.kind === "challenge")
    .filter((m) => {
      if (filter.status === "open" || !filter.status) return m.status === "lobby";
      if (filter.status === "live") return m.status === "playing";
      if (filter.status === "closed") return m.status === "finished";
      return true;
    })
    .filter((m) => !filter.gameId || m.gameId === filter.gameId)
    .filter((m) => filter.minFee == null || m.entryFee >= filter.minFee)
    .filter((m) => filter.maxFee == null || m.entryFee <= filter.maxFee)
    .filter((m) => {
      if (!keyword) return true;
      const topic = String(m.customConfig?.topic ?? m.state?.topic ?? "").toLowerCase();
      return topic.includes(keyword) || m.id.toLowerCase().includes(keyword);
    })
    .map(toChallenge);
}

export async function createChallenge(opts: {
  gameId: GameId;
  entryFee: unknown;
  minPlayers?: number;
  maxPlayers?: number;
  minToStart?: number;
  lobbyTimeoutMs?: number;
  customConfig?: unknown;
  walletId?: string;
  paymentHeader?: string | null;
}): Promise<ActionResult> {
  await ready();
  const spec = catalogById(opts.gameId);
  const entryFee = parseEntryFee(opts.entryFee ?? spec.entryFee);
  const customConfig = parseCustomConfig(opts.customConfig, opts.gameId);
  const match = await createMatchInternal({
    gameId: opts.gameId,
    kind: "challenge",
    withBots: false,
    entryFee,
    minPlayers: opts.minPlayers,
    maxPlayers: opts.maxPlayers ?? spec.maxPlayers,
    minToStart: opts.minToStart,
    lobbyTimeoutMs: opts.lobbyTimeoutMs,
    customConfig,
  });
  const sit = opts.walletId || opts.paymentHeader;
  if (!sit) {
    await flush();
    return {
      ok: false,
      paymentRequired: {
        x402Version: 1,
        accepts: [
          paymentAccept({
            amount: entryFee,
            resource: `/api/v1/challenges/${match.id}/join`,
            description: `Challenge entry ${match.id}`,
            kind: "entry",
          }),
        ],
      },
      match: toPublic(match),
      challenge: toChallenge(match),
    };
  }
  const joined = await joinMatch({
    matchId: match.id,
    walletId: opts.walletId,
    paymentHeader: opts.paymentHeader,
    controller: "human",
  });
  if (joined.ok && joined.match) {
    const seated = mustMatch(match.id);
    seated.creatorId = joined.match.you?.id ?? opts.walletId;
    touchMatch(seated);
    await flush();
    return {
      ok: true,
      match: toPublic(seated, seated.creatorId),
      challenge: toChallenge(seated),
    };
  }
  await flush();
  return { ...joined, match: joined.match ?? toPublic(match), challenge: toChallenge(mustMatch(match.id)) };
}

export async function startChallenge(opts: {
  matchId: string;
  walletId?: string;
  secret?: string;
}): Promise<ActionResult> {
  await ready();
  await pullMatch(opts.matchId);
  const match = getWorld().matches.get(opts.matchId);
  if (!match) return { ok: false, error: "Challenge not found" };
  if (match.kind !== "challenge") return { ok: false, error: "Not a challenge table" };
  if (match.status !== "lobby") return { ok: false, error: "Challenge already underway" };
  const minToStart = match.minToStart ?? match.minPlayers;
  if (match.players.length < minToStart) {
    return { ok: false, error: `Need ${minToStart} agents to start (have ${match.players.length})` };
  }
  const parsed = parsePaymentHeader(null, opts.walletId, opts.secret);
  if (!parsed || parsed.walletId !== match.creatorId) {
    return { ok: false, error: "Only the creator can force-start" };
  }
  await startMatch(match);
  await flush();
  return { ok: true, match: toPublic(match, opts.walletId), challenge: toChallenge(match) };
}

function unusedBot(match: Match): Wallet | undefined {
  const taken = new Set(match.players.map((p) => p.walletId));
  const world = getWorld();
  for (const name of BOT_NAMES) {
    const w = world.wallets.get(name.toLowerCase());
    if (w && !taken.has(w.id) && w.balance >= match.entryFee) return w;
  }
  return undefined;
}

function fillBots(match: Match, target: number) {
  if (!match.withBots) return;
  while (match.players.length < target) {
    const w = unusedBot(match);
    if (!w) break;
    seatPlayer(match, w, "bot");
  }
}

export async function addBots(matchId: string, count = 2): Promise<Match> {
  await ready();
  if (!getWorld().houseBots) throw new EngineError("House bots are off");
  const match = mustMatch(matchId);
  if (match.status !== "lobby") throw new EngineError("Table already underway");
  match.withBots = true;
  fillBots(match, Math.min(match.players.length + count, match.maxPlayers));
  if (match.players.length >= match.minPlayers) await startMatch(match);
  await flush();
  return match;
}

function mustMatch(id: string): Match {
  const m = getWorld().matches.get(id);
  if (!m) throw new EngineError("Table not found", 404);
  return m;
}

function mustWallet(id: string): Wallet {
  const w = getWorld().wallets.get(id);
  if (!w) throw new EngineError("Wallet not found", 404);
  return w;
}

function seatPlayer(match: Match, wallet: Wallet, controller: Controller): Player {
  if (match.status !== "lobby") throw new Error("Table is not in lobby");
  if (match.players.length >= match.maxPlayers) throw new Error("Table is full");
  if (match.players.some((p) => p.walletId === wallet.id)) {
    throw new Error("Already seated");
  }
  debit(wallet, match.entryFee);
  touchWallet(wallet);
  match.prizePool += match.entryFee;
  recordLedger({
    from: wallet.id,
    to: "treasury",
    amount: match.entryFee,
    kind: "entry",
    matchId: match.id,
    note: `Entry ${match.gameId} ${match.id}`,
  });
  const player: Player = {
    id: wallet.id,
    name: wallet.name,
    walletId: wallet.id,
    controller,
    tint: TINTS[match.players.length % TINTS.length]!,
    joinedAt: Date.now(),
    connected: true,
  };
  match.players.push(player);
  log(
    match,
    "join",
    `${player.name} paid ${formatUsdc(match.entryFee)} entry and sat down. Pot ${formatUsdc(match.prizePool)}.`,
    player.id,
  );
  log(match, "pay", `${player.name} → treasury ${formatUsdc(match.entryFee)} (entry).`, player.id);
  return player;
}

export async function joinMatch(opts: {
  matchId: string;
  walletId?: string;
  secret?: string;
  paymentHeader?: string | null;
  controller?: Controller;
}): Promise<ActionResult> {
  await ready();
  await pullMatch(opts.matchId);
  const match = mustMatch(opts.matchId);
  if (match.status !== "lobby") {
    return { ok: false, error: "Table is not in lobby" };
  }
  const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId, opts.secret);
  if (!parsed) {
    return {
      ok: false,
      paymentRequired: {
        x402Version: 1,
        accepts: [
          paymentAccept({
            amount: match.entryFee,
            resource: `/api/v1/matches/${match.id}/join`,
            description: `Entry fee for ${match.id}`,
            kind: "entry",
          }),
        ],
      },
    };
  }
  try {
    await pullWallet(parsed.walletId);
    const wallet = mustWallet(parsed.walletId);
    seatPlayer(match, wallet, opts.controller === "bot" ? "bot" : "human");
    // Creator sits first. Then remaining seats fill with house agents.
    if (match.withBots) {
      fillBots(match, botFillTarget(match.gameId, match.maxPlayers));
    }
    if (
      match.players.length >= match.maxPlayers ||
      (match.withBots && match.players.length >= match.minPlayers) ||
      (catalogById(match.gameId).oneshot && match.players.length >= match.minPlayers)
    ) {
      await startMatch(match);
    }
    await flush();
    return { ok: true, match: toPublic(match, wallet.id) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Join failed" };
  }
}

async function startMatch(match: Match) {
  if (match.status !== "lobby") return;
  const need = match.kind === "challenge" ? (match.minToStart ?? match.minPlayers) : match.minPlayers;
  if (match.players.length < need) return;

  if (match.gameId === "coinpump") {
    const { quotes, source } = await fetchQuotes();
    if (match.status !== "lobby") return;
    const state = createCoinPumpState(Date.now(), quotes, source);
    match.state = state;
    match.status = "playing";
    match.startedAt = Date.now();
    match.turnDeadline = state.windowEndsAt;
    log(
      match,
      "system",
      `Match started with ${match.players.length} agents. Prize pool ${formatUsdc(match.prizePool)}.`,
    );
    const src = source === "coingecko" ? "CoinGecko spot" : "simulated spot (feed unavailable)";
    log(
      match,
      "system",
      `Five coins are on the tape. Window 10 minutes, picks lock in 90s. Source: ${src}.`,
    );
    for (const c of quotes) {
      log(match, "system", `${c.ticker} opens at $${c.startUsd.toFixed(c.startUsd < 2 ? 4 : 2)}.`);
    }
    return;
  }

  match.status = "playing";
  match.startedAt = Date.now();
  log(
    match,
    "system",
    `Match started with ${match.players.length} agents. Prize pool ${formatUsdc(match.prizePool)}.`,
  );

  switch (match.gameId) {
    case "snakes": {
      match.state = createSnakesState(match.players);
      match.currentPlayerId = match.players[0]!.id;
      match.turnDeadline = Date.now() + SNAKES_TURN_MS;
      log(match, "system", `${match.players[0]!.name} opens the dice.`);
      break;
    }
    case "debate": {
      const state = createDebateState(match.players, Date.now(), match.customConfig);
      match.state = state;
      const seat = currentDebateSeat(state);
      match.currentPlayerId = seat?.playerId;
      match.turnDeadline = state.windowEndsAt;
      log(match, "system", `Motion: ${state.topic}`);
      if (state.rubric && state.rubric !== "balanced") {
        log(match, "judge", `Panel rubric: ${state.rubric}. Logic 40 · relevance 40 · rhetoric 20.`);
      }
      if (seat) {
        log(
          match,
          "system",
          `${playerName(match, seat.playerId)} has the floor for opening.`,
          seat.playerId,
        );
      }
      break;
    }
    case "rps": {
      const state = createRpsState(match.players, Date.now());
      match.state = state;
      match.turnDeadline = state.windowEndsAt;
      log(match, "system", "Round 1 of 5. Throw rock, paper, or scissors. Chat agents: POST commit with a 5-throw tape, then stop.");
      break;
    }
    case "dilemma": {
      const state = createDilemmaState(match.players, Date.now());
      match.state = state;
      match.turnDeadline = state.windowEndsAt;
      log(
        match,
        "system",
        "Round 1 of 5. Seal your move. Envelopes stay closed until both lock. Chat agents: POST commit with a 5-move tape, then stop.",
      );
      break;
    }
    case "target": {
      const state = createTargetState(Date.now());
      match.state = state;
      match.turnDeadline = state.windowEndsAt;
      log(
        match,
        "system",
        "Lock one integer 1–99. One POST. Closest to the draw wins. Chat agents can leave after they lock.",
      );
      break;
    }
  }
}

function advanceSnakesTurn(match: Match) {
  const state = match.state as SnakesState;
  state.turnIndex = (state.turnIndex + 1) % match.players.length;
  const next = match.players[state.turnIndex]!;
  match.currentPlayerId = next.id;
  match.turnDeadline = Date.now() + SNAKES_TURN_MS;
}

function finishMatch(match: Match, winnerIds: string[]) {
  if (match.status === "finished") return;
  match.status = "finished";
  match.finishedAt = Date.now();
  match.currentPlayerId = undefined;
  match.turnDeadline = undefined;
  match.winners = winnerIds;

  if (winnerIds.length === 0 || match.prizePool <= 0) {
    if (match.prizePool > 0) {
      log(match, "win", "No winner. Pot stays in the treasury.");
    }
    match.prizePool = 0;
    log(
      match,
      "system",
      "Table closed. This table does not rematch — sit a new one from the floor if you want another game.",
    );
    return;
  }
  const share = Math.floor(match.prizePool / winnerIds.length);
  const remainder = match.prizePool - share * winnerIds.length;
  for (let i = 0; i < winnerIds.length; i++) {
    const id = winnerIds[i]!;
    const amount = share + (i === 0 ? remainder : 0);
    const wallet = getWorld().wallets.get(id);
    if (wallet) {
      credit(wallet, amount);
      touchWallet(wallet);
      match.payouts.push({ playerId: id, amount });
      recordLedger({
        from: "treasury",
        to: wallet.id,
        amount,
        kind: "payout",
        matchId: match.id,
        note: `Prize ${match.id}`,
      });
      log(
        match,
        "win",
        `${wallet.name} is paid ${formatUsdc(amount)} from the pot.`,
        id,
      );
    }
  }
  match.prizePool = 0;
  const names =
    winnerIds.length > 0
      ? winnerIds.map((id) => playerName(match, id)).join(", ")
      : "nobody";
  log(
    match,
    "system",
    `Table closed. Pot paid to ${names}. This table does not rematch — sit a new one from the floor if you want another game.`,
  );
}

function refundEntry(match: Match, player: Player) {
  const wallet = getWorld().wallets.get(player.walletId);
  if (!wallet || match.entryFee <= 0) return;
  credit(wallet, match.entryFee);
  touchWallet(wallet);
  match.prizePool = Math.max(0, match.prizePool - match.entryFee);
  recordLedger({
    from: "treasury",
    to: wallet.id,
    amount: match.entryFee,
    kind: "refund",
    matchId: match.id,
    note: `Lobby closed ${match.id}`,
  });
  log(
    match,
    "pay",
    `${wallet.name} refunded ${formatUsdc(match.entryFee)} (lobby closed).`,
    player.id,
  );
}

async function abandonLobby(match: Match) {
  if (match.status !== "lobby") return;
  const world = getWorld();
  if (match.players.length === 0) {
    world.matches.delete(match.id);
    world.dirtyMatches.delete(match.id);
    await deleteMatch(match.id);
    return;
  }
  for (const p of match.players) refundEntry(match, p);
  match.prizePool = 0;
  log(
    match,
    "system",
    match.kind === "challenge"
      ? "Challenge expired. Entries refunded in full."
      : "Lobby closed after 2 minutes without enough agents. Entries refunded.",
  );
  match.cancelled = true;
  finishMatch(match, []);
}

async function forceSettle(match: Match) {
  if (match.status !== "playing") return;
  log(match, "system", "Clock ran out. Settling the table.");

  if (match.gameId === "snakes") {
    const state = match.state as SnakesState;
    let best = -1;
    const winners: string[] = [];
    for (const p of match.players) {
      const pos = state.pieces[p.id]?.position ?? 0;
      if (pos > best) {
        best = pos;
        winners.length = 0;
        winners.push(p.id);
      } else if (pos === best) {
        winners.push(p.id);
      }
    }
    finishMatch(match, winners);
    return;
  }

  if (match.gameId === "debate") {
    const state = match.state as DebateState;
    if (state.scores) {
      finishMatch(match, debateWinners(state));
      return;
    }
    state.roundIndex = ROUND_SEQUENCE.length;
    state.judging = true;
    await runJudge(match);
    return;
  }

  if (match.gameId === "coinpump") {
    const state = match.state as CoinPumpState;
    if (state.resolved) {
      finishMatch(match, []);
      return;
    }
    await refreshQuotes(state);
    const { ranking, winnerCoinIds } = resolveCoinPump(state);
    const top = ranking[0];
    const topCoin = state.coins.find((c) => c.id === top?.id);
    log(
      match,
      "system",
      `Window closed. Top tape: ${topCoin?.ticker ?? "?"} ${top && top.changePct >= 0 ? "+" : ""}${top?.changePct.toFixed(3)}%.`,
    );
    const winners = match.players
      .filter((p) => winnerCoinIds.includes(state.picks[p.id] ?? ""))
      .map((p) => p.id);
    if (winners.length === 0) {
      log(match, "win", "Nobody picked the top tape. Pot stays in the treasury.");
      finishMatch(match, []);
    } else {
      log(match, "win", `${winners.map((id) => playerName(match, id)).join(", ")} called it.`);
      finishMatch(match, winners);
    }
    return;
  }

  if (match.gameId === "rps") {
    const state = match.state as RpsState;
    const round = state.rounds[state.roundIndex];
    if (round && !round.resolved) resolveRpsRound(match);
    if (match.status === "playing") {
      const max = Math.max(0, ...match.players.map((p) => state.scores[p.id] ?? 0));
      const winners = match.players
        .filter((p) => (state.scores[p.id] ?? 0) === max)
        .map((p) => p.id);
      finishMatch(match, winners);
    }
    return;
  }

  if (match.gameId === "dilemma") {
    const state = match.state as DilemmaState;
    const round = state.rounds[state.roundIndex];
    if (round && !round.resolved) resolveDilemmaRound(match);
    if (match.status === "playing") {
      const max = Math.max(0, ...match.players.map((p) => state.scores[p.id] ?? 0));
      const winners = match.players
        .filter((p) => (state.scores[p.id] ?? 0) === max)
        .map((p) => p.id);
      finishMatch(match, winners);
    }
  }
}

function takePowerupFee(match: Match, wallet: Wallet, amount: number, note: string) {
  debit(wallet, amount);
  touchWallet(wallet);
  match.prizePool += amount;
  recordLedger({
    from: wallet.id,
    to: "treasury",
    amount,
    kind: "powerup",
    matchId: match.id,
    note,
  });
  log(
    match,
    "pay",
    `${wallet.name} paid ${formatUsdc(amount)} (${note}). Pot ${formatUsdc(match.prizePool)}.`,
    wallet.id,
  );
}

export async function submitAction(opts: {
  matchId: string;
  walletId?: string;
  secret?: string;
  paymentHeader?: string | null;
  action: AgentAction;
}): Promise<ActionResult> {
  await ready();
  await pullMatch(opts.matchId);
  const match = mustMatch(opts.matchId);
  if (match.status === "finished") {
    return { ok: false, error: "Table is closed. No rematch — open a new table from the floor." };
  }
  if (match.status !== "playing") return { ok: false, error: "Match is not live" };
  const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId, opts.secret);
  const walletId = parsed?.walletId;
  if (!walletId) {
    return { ok: false, error: "Unauthorized. Send walletId and secret from POST /wallets." };
  }
  await pullWallet(walletId);
  const player = match.players.find((p) => p.id === walletId);
  if (!player) return { ok: false, error: "You are not seated at this table" };

  try {
    applyAction(match, player, opts.action, opts.paymentHeader ?? null);
    await flush();
    return { ok: true, match: toPublic(match, player.id) };
  } catch (err) {
    if (err instanceof PaymentNeeded) {
      return { ok: false, paymentRequired: err.body };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Action failed" };
  }
}

class PaymentNeeded extends Error {
  body: { x402Version: 1; accepts: ReturnType<typeof paymentAccept>[] };
  constructor(accepts: ReturnType<typeof paymentAccept>[]) {
    super("Payment required");
    this.body = { x402Version: 1, accepts };
  }
}

function requirePaid(
  match: Match,
  player: Player,
  header: string | null,
  amount: number,
  kind: string,
  note: string,
) {
  const wallet = mustWallet(player.walletId);
  const parsed = parsePaymentHeader(header);
  if (!parsed || parsed.walletId !== player.walletId) {
    throw new PaymentNeeded([
      paymentAccept({
        amount,
        resource: `/api/v1/matches/${match.id}/action`,
        description: note,
        kind,
      }),
    ]);
  }
  takePowerupFee(match, wallet, amount, note);
}

function applyAction(
  match: Match,
  player: Player,
  action: AgentAction,
  header: string | null,
) {
  const type = String(action.type ?? "");
  switch (match.gameId) {
    case "snakes":
      applySnakes(match, player, type, action, header);
      break;
    case "debate":
      applyDebate(match, player, type, action);
      break;
    case "coinpump":
      applyCoinPump(match, player, type, action);
      break;
    case "rps":
      applyRps(match, player, type, action, header);
      break;
    case "dilemma":
      applyDilemma(match, player, type, action);
      break;
    case "target":
      applyTarget(match, player, type, action);
      break;
    default:
      throw new Error("Unknown game");
  }
}

function applySnakes(
  match: Match,
  player: Player,
  type: string,
  action: AgentAction,
  header: string | null,
) {
  const state = match.state as SnakesState;
  if (type === "pilot") {
    if (state.pilots?.[player.id]) throw new Error("Already on pilot");
    state.pilots = { ...(state.pilots ?? {}), [player.id]: true };
    log(
      match,
      "system",
      `${player.name} handed the dice to the table. Chat can close — the seat keeps rolling.`,
      player.id,
    );
    return;
  }
  if (match.currentPlayerId !== player.id) throw new Error("Not your turn");
  let powerupRaw = action.powerup ?? action.option;
  if (type === "reroll" || type === "ward") powerupRaw = type;
  else if (type !== "roll") throw new Error('Send { type: "roll" } with optional powerup "reroll" | "ward", or { type: "pilot" }');
  const powerup =
    powerupRaw === "reroll" || powerupRaw === "ward" ? (powerupRaw as "reroll" | "ward") : undefined;
  if (powerup === "reroll") {
    requirePaid(match, player, header, REROLL_FEE, "reroll", "re-roll");
  }
  if (powerup === "ward") {
    requirePaid(match, player, header, WARD_FEE, "ward", "snake ward");
  }
  const piece = state.pieces[player.id] ?? { position: 0 };
  const result = resolveSnakesTurn({
    name: player.name,
    from: piece.position,
    powerup,
  });
  piece.position = result.to;
  state.pieces[player.id] = piece;
  state.lastRoll = {
    playerId: player.id,
    die: result.die,
    from: result.from,
    to: result.to,
  };
  for (const line of result.logs) log(match, "move", line, player.id);
  if (result.won) {
    finishMatch(match, [player.id]);
    return;
  }
  advanceSnakesTurn(match);
}

function applyDebate(
  match: Match,
  player: Player,
  type: string,
  action: AgentAction,
) {
  if (type !== "submit") throw new Error("Send { type: \"submit\", text: \"...\" }");
  const text = stripInjected(String(action.text ?? "")).trim();
  if (text.length < 12) throw new Error("Argument is too short");
  if (text.length > 1200) throw new Error("Argument is too long");
  const state = match.state as DebateState;
  const seat = currentDebateSeat(state);
  if (!seat || seat.playerId !== player.id) throw new Error("Not your window");
  if (state.speeches.some((s) => s.playerId === player.id && s.round === seat.kind)) {
    throw new Error("Already submitted this round");
  }
  state.speeches.push({
    playerId: player.id,
    round: seat.kind,
    text,
    submittedAt: Date.now(),
  });
  log(
    match,
    "move",
    `${player.name} filed their ${seat.kind}: "${truncate(text, 160)}"`,
    player.id,
  );
  advanceDebate(match);
}

function advanceDebate(match: Match) {
  const state = match.state as DebateState;
  state.roundIndex += 1;
  if (state.roundIndex >= ROUND_SEQUENCE.length) {
    match.currentPlayerId = undefined;
    match.turnDeadline = undefined;
    state.judging = true;
    (state as DebateState & { judgeStarted?: number }).judgeStarted = Date.now();
    log(match, "judge", "The floor is closed. The judge is scoring.");
    void runJudge(match);
    return;
  }
  const kind = ROUND_SEQUENCE[state.roundIndex]!;
  const seat = currentDebateSeat(state);
  state.windowEndsAt = Date.now() + debateWindowMs(state, kind);
  match.currentPlayerId = seat?.playerId;
  match.turnDeadline = state.windowEndsAt;
  if (seat) {
    log(
      match,
      "system",
      `${playerName(match, seat.playerId)} has the floor for ${kind}.`,
      seat.playerId,
    );
  }
}

async function runJudge(match: Match) {
  const state = match.state as DebateState;
  const names: Record<string, string> = {};
  for (const p of match.players) names[p.id] = p.name;
  const result = await judgeDebate({
    topic: state.topic,
    names,
    speeches: state.speeches,
    speakerOrder: state.speakerOrder,
    rubric: state.rubric,
  });
  state.scores = result.scores;
  state.verdict = result.verdict;
  state.panel = result.panel;
  state.judging = false;
  log(match, "judge", result.verdict);
  for (const judge of result.panel.judges) {
    const bits = match.players
      .map((p) => {
        const s = judge.scores[p.id];
        if (!s) return null;
        return `${p.name} L${s.logic} R${s.relevance} C${s.rhetoric} = ${s.total}`;
      })
      .filter(Boolean)
      .join(" · ");
    log(match, "judge", `${judge.name}: ${bits}`);
  }
  for (const p of match.players) {
    const s = result.scores[p.id];
    if (s) {
      log(
        match,
        "judge",
        `${p.name} consensus ${s.total}/10 (logic ${s.logic} · relevance ${s.relevance} · rhetoric ${s.rhetoric}) — ${s.notes}`,
        p.id,
      );
    }
  }
  finishMatch(match, debateWinners(state));
  await flush();
}

function applyCoinPump(
  match: Match,
  player: Player,
  type: string,
  action: AgentAction,
) {
  if (type !== "pick") throw new Error("Send { type: \"pick\", coinId: \"btc\" }");
  const state = match.state as CoinPumpState;
  if (Date.now() >= state.lockAt) throw new Error("Picks are locked");
  if (state.picks[player.id]) throw new Error("Already picked — picks are write-once");
  const coinId = String(action.coinId ?? action.option ?? "");
  const coin = state.coins.find((c) => c.id === coinId || c.ticker.toLowerCase() === coinId.toLowerCase());
  if (!coin) throw new Error("Unknown coin");
  state.picks[player.id] = coin.id;
  log(match, "move", `${player.name} picks ${coin.ticker}.`, player.id);
}

function applyRps(
  match: Match,
  player: Player,
  type: string,
  action: AgentAction,
  header: string | null,
) {
  const state = match.state as RpsState;
  const round = state.rounds[state.roundIndex];
  if (!round || round.resolved) throw new Error("Wait for the next round");
  if (round.throws[player.id]) {
    throw new Error("Already thrown this round");
  }

  if (type === "scout") {
    requirePaid(match, player, header, SCOUT_FEE, "scout", "scout");
    state.scouts[`${state.roundIndex}:${player.id}`] = true;
    const seen = match.players
      .filter((p) => p.id !== player.id && state.lastThrows[p.id])
      .map((p) => `${p.name} last threw ${state.lastThrows[p.id]}`)
      .join("; ");
    log(
      match,
      "move",
      `${player.name} bought a scout. ${seen || "No prior throws on record."}`,
      player.id,
    );
    return;
  }
  if (type === "commit") {
    if (state.tape?.[player.id]) throw new Error("Tape already sealed");
    if (round.throws[player.id]) throw new Error("Already thrown this round — too late to seal a tape");
    const raw = Array.isArray(action.tape) ? action.tape : [];
    if (raw.length !== RPS_ROUNDS) {
      throw new Error(`Send { type: "commit", tape: [5 gestures] } — rock, paper, or scissors`);
    }
    const tape: Gesture[] = [];
    for (const item of raw) {
      const g = String(item);
      if (!GESTURES.includes(g as Gesture)) throw new Error("Each tape slot must be rock, paper, or scissors");
      tape.push(g as Gesture);
    }
    state.tape = { ...(state.tape ?? {}), [player.id]: tape };
    log(match, "move", `${player.name} sealed a 5-round tape. The table will throw for them.`, player.id);
    drainRpsTapes(match);
    return;
  }
  if (type !== "throw") throw new Error("Send { type: \"throw\", gesture: \"rock\" } or { type: \"commit\", tape: [...] }");
  const gesture = String(action.gesture ?? action.option ?? "") as Gesture;
  if (!GESTURES.includes(gesture)) throw new Error("gesture must be rock, paper, or scissors");
  round.throws[player.id] = gesture;
  log(match, "move", `${player.name} locks a throw.`, player.id);
  if (Object.keys(round.throws).length >= match.players.length) {
    resolveRpsRound(match);
  }
}

function resolveRpsRound(match: Match) {
  const state = match.state as RpsState;
  const round = state.rounds[state.roundIndex];
  if (!round || round.resolved) return;
  for (const p of match.players) {
    if (!round.throws[p.id]) {
      const g = botGesture(state, p.id);
      round.throws[p.id] = g;
      log(match, "move", `${p.name} missed the window and the table drew ${g}.`, p.id);
    }
  }
  const gained = scoreRound(match.players, round.throws);
  round.scores = gained;
  round.resolved = true;
  state.revealing = true;
  const streakBefore = { ...state.scores };
  for (const p of match.players) {
    const g = round.throws[p.id]!;
    state.lastThrows[p.id] = g;
    let add = gained[p.id] ?? 0;
    if ((streakBefore[p.id] ?? 0) > 0 && add >= 2) add += 1;
    state.scores[p.id] = (state.scores[p.id] ?? 0) + add;
    log(
      match,
      "move",
      `${p.name} threw ${g} · +${add} this round · total ${state.scores[p.id]}.`,
      p.id,
    );
  }
  if (state.roundIndex + 1 >= RPS_ROUNDS) {
    const max = Math.max(...match.players.map((p) => state.scores[p.id] ?? 0));
    const winners = match.players.filter((p) => (state.scores[p.id] ?? 0) === max).map((p) => p.id);
    log(match, "system", "Five rounds in the book.");
    finishMatch(match, winners);
    return;
  }
  nextRpsRound(state, Date.now());
  match.turnDeadline = state.windowEndsAt;
  log(match, "system", `Round ${state.roundIndex + 1} of ${RPS_ROUNDS}.`);
}

function applyDilemma(match: Match, player: Player, type: string, action: AgentAction) {
  const state = match.state as DilemmaState;
  const round = state.rounds[state.roundIndex];
  if (!round || round.resolved) throw new Error("Wait for the next round");
  if (type === "commit") {
    if (state.tape?.[player.id]) throw new Error("Tape already sealed");
    if (round.sealed[player.id]) throw new Error("Already sealed this round — too late for a tape");
    const raw = Array.isArray(action.tape) ? action.tape : [];
    if (raw.length !== DILEMMA_ROUNDS) {
      throw new Error('Send { type: "commit", tape: [5 moves] } — cooperate or defect');
    }
    const tape: DilemmaMove[] = [];
    for (const item of raw) {
      const m = String(item);
      if (!isDilemmaMove(m)) throw new Error("Each tape slot must be cooperate or defect");
      tape.push(m);
    }
    state.tape = { ...(state.tape ?? {}), [player.id]: tape };
    log(match, "move", `${player.name} sealed a 5-round tape. Envelopes stay closed.`, player.id);
    drainDilemmaTapes(match);
    return;
  }
  if (round.sealed[player.id]) throw new Error("Already sealed this round");
  if (type !== "choose") {
    throw new Error('Send { type: "choose", move: "cooperate" } or "defect", or { type: "commit", tape: [...] }');
  }
  const raw = String(action.move ?? action.option ?? "");
  if (!isDilemmaMove(raw)) throw new Error('move must be "cooperate" or "defect"');
  round.sealed[player.id] = raw;
  log(match, "move", `${player.name} sealed a move. The envelope stays closed.`, player.id);
  if (Object.keys(round.sealed).length >= match.players.length) {
    resolveDilemmaRound(match);
  }
}

function resolveDilemmaRound(match: Match) {
  const state = match.state as DilemmaState;
  const round = state.rounds[state.roundIndex];
  if (!round || round.resolved) return;
  for (const p of match.players) {
    if (!round.sealed[p.id]) {
      round.sealed[p.id] = "defect";
      log(match, "move", `${p.name} missed the window. The table sealed a default.`, p.id);
    }
  }
  const a = match.players[0];
  const b = match.players[1];
  if (!a || !b) {
    round.resolved = true;
    finishMatch(match, []);
    return;
  }
  const ma = round.sealed[a.id]!;
  const mb = round.sealed[b.id]!;
  const [sa, sb] = payoff(ma, mb);
  round.scores[a.id] = sa;
  round.scores[b.id] = sb;
  state.scores[a.id] = (state.scores[a.id] ?? 0) + sa;
  state.scores[b.id] = (state.scores[b.id] ?? 0) + sb;
  round.resolved = true;
  state.revealing = true;
  log(
    match,
    "move",
    `Envelopes open. ${a.name} ${said(ma)}. ${b.name} ${said(mb)}.`,
  );
  log(
    match,
    "move",
    roundLine(a.name, ma, sa, state.scores[a.id]!) + " · " + roundLine(b.name, mb, sb, state.scores[b.id]!),
  );
  if (state.roundIndex + 1 >= DILEMMA_ROUNDS) {
    const max = Math.max(...match.players.map((p) => state.scores[p.id] ?? 0));
    const winners = match.players.filter((p) => (state.scores[p.id] ?? 0) === max).map((p) => p.id);
    log(match, "system", "Five rounds in the book.");
    finishMatch(match, winners);
    return;
  }
  nextDilemmaRound(state, Date.now());
  match.turnDeadline = state.windowEndsAt;
  log(match, "system", `Round ${state.roundIndex + 1} of ${DILEMMA_ROUNDS}. Seal again.`);
}

function drainRpsTapes(match: Match) {
  const state = match.state as RpsState;
  for (let i = 0; i < RPS_ROUNDS + 2 && match.status === "playing"; i++) {
    const round = state.rounds[state.roundIndex];
    if (!round || round.resolved) break;
    let placed = false;
    for (const p of match.players) {
      if (round.throws[p.id]) continue;
      const g = state.tape?.[p.id]?.[state.roundIndex];
      if (!g) continue;
      round.throws[p.id] = g;
      log(match, "move", `${p.name} locks a throw.`, p.id);
      placed = true;
    }
    if (Object.keys(round.throws).length >= match.players.length) {
      resolveRpsRound(match);
      continue;
    }
    if (!placed) break;
  }
}

function drainDilemmaTapes(match: Match) {
  const state = match.state as DilemmaState;
  for (let i = 0; i < DILEMMA_ROUNDS + 2 && match.status === "playing"; i++) {
    const round = state.rounds[state.roundIndex];
    if (!round || round.resolved) break;
    let placed = false;
    for (const p of match.players) {
      if (round.sealed[p.id]) continue;
      const m = state.tape?.[p.id]?.[state.roundIndex];
      if (!m) continue;
      round.sealed[p.id] = m;
      log(match, "move", `${p.name} sealed a move. The envelope stays closed.`, p.id);
      placed = true;
    }
    if (Object.keys(round.sealed).length >= match.players.length) {
      resolveDilemmaRound(match);
      continue;
    }
    if (!placed) break;
  }
}

function applyTarget(match: Match, player: Player, type: string, action: AgentAction) {
  if (type !== "lock") throw new Error('Send { type: "lock", value: 47 } — integer 1–99');
  const state = match.state as TargetState;
  if (state.resolved) throw new Error("Draw already landed");
  if (Date.now() >= state.windowEndsAt) throw new Error("Lock window closed");
  if (state.locks[player.id] != null) throw new Error("Already locked");
  const value = Number(action.value ?? action.option);
  if (!isTargetValue(value)) throw new Error("value must be a whole number from 1 to 99");
  state.locks[player.id] = value;
  log(match, "move", `${player.name} locked a number. The envelope stays closed.`, player.id);
  if (Object.keys(state.locks).length >= match.players.length) {
    resolveTarget(match);
  }
}

function resolveTarget(match: Match) {
  const state = match.state as TargetState;
  if (state.resolved) return;
  const secret = 1 + Math.floor(Math.random() * 99);
  state.secret = secret;
  state.resolved = true;
  log(match, "system", `The table drew ${secret}.`);
  const seated = match.players.filter((p) => state.locks[p.id] != null);
  if (seated.length === 0) {
    log(match, "win", "Nobody locked a number. Pot stays in the treasury.");
    finishMatch(match, []);
    return;
  }
  const dist = (id: string) => Math.abs((state.locks[id] ?? 999) - secret);
  const best = Math.min(...seated.map((p) => dist(p.id)));
  const winners = seated.filter((p) => dist(p.id) === best);
  for (const p of match.players) {
    const n = state.locks[p.id];
    if (n == null) {
      log(match, "move", `${p.name} had no lock.`, p.id);
    } else {
      log(match, "move", `${p.name} locked ${n} · distance ${Math.abs(n - secret)}.`, p.id);
    }
  }
  log(match, "win", `${winners.map((p) => p.name).join(", ")} closest to ${secret}.`);
  finishMatch(match, winners.map((p) => p.id));
}

function said(move: DilemmaMove) {
  return move === "cooperate" ? "cooperated" : "defected";
}

function roundLine(name: string, move: DilemmaMove, gained: number, total: number) {
  return `${name} ${move}s · +${gained} · total ${total}`;
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function stripInjected(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/\s+/g, " ");
}

async function tickAll() {
  const world = getWorld();
  for (const match of world.matches.values()) {
    try {
      await tickMatch(match);
    } catch {
      /* keep going */
    }
  }
}

async function tickMatch(match: Match) {
  const now = Date.now();
  if (match.status === "lobby") {
    if (match.kind === "challenge") {
      if (match.players.length >= match.maxPlayers) {
        await startMatch(match);
        return;
      }
      if (now >= (match.expiresAt ?? match.createdAt + (match.lobbyTimeoutMs ?? CHALLENGE_LOBBY_MS))) {
        if (match.players.length >= (match.minToStart ?? match.minPlayers)) {
          await startMatch(match);
        } else {
          await abandonLobby(match);
        }
      }
      return;
    }
    if (match.players.length < match.minPlayers) {
      if (now - lobbyIdleSince(match) > (match.lobbyTimeoutMs ?? EMPTY_LOBBY_MS)) {
        await abandonLobby(match);
        return;
      }
    }
    const hasGuest = match.players.some((p) => p.controller !== "bot");
    // Never fill an empty withBots lobby — the creator still needs a seat.
    if (match.withBots && hasGuest && match.players.length < match.maxPlayers) {
      fillBots(match, botFillTarget(match.gameId, match.maxPlayers));
    }
    if (match.players.length >= match.minPlayers) {
      const lastJoin = Math.max(...match.players.map((p) => p.joinedAt), match.createdAt);
      const oneshot = Boolean(catalogById(match.gameId).oneshot);
      const waitMs = match.withBots || oneshot ? 400 : 2_000;
      if (now - lastJoin > waitMs || match.players.length >= match.maxPlayers) {
        await startMatch(match);
      }
    }
  }
  if (match.status !== "playing") return;

  if (match.startedAt && now - match.startedAt > (MAX_PLAY_MS[match.gameId] ?? 8 * 60_000)) {
    await forceSettle(match);
    return;
  }

  if (match.gameId === "snakes") {
    const current = match.players.find((p) => p.id === match.currentPlayerId);
    if (!current) {
      await forceSettle(match);
      return;
    }
    const due = (match.turnDeadline ?? 0) <= now;
    const piloted = Boolean((match.state as SnakesState).pilots?.[current.id]);
    const autoSeat = current.controller === "bot" || piloted;
    const botReady = autoSeat && (match.turnDeadline ?? 0) - now < SNAKES_TURN_MS - SNAKES_BOT_DELAY_MS;
    if (due && !autoSeat) {
      log(match, "system", `${current.name} missed the window. The table rolls.`, current.id);
      try {
        applyAction(match, current, { type: "roll" }, current.walletId);
      } catch {
        advanceSnakesTurn(match);
      }
      return;
    }
    if (due || botReady) {
      const state = match.state as SnakesState;
      const powerup = current.controller === "bot" ? snakesBotPowerup(state, current.id) : undefined;
      const action: AgentAction = { type: "roll" };
      if (powerup) action.powerup = powerup;
      try {
        applyAction(match, current, action, current.walletId);
      } catch {
        applyAction(match, current, { type: "roll" }, current.walletId);
      }
    }
    return;
  }

  if (match.gameId === "debate") {
    const state = match.state as DebateState;
    if (state.judging) {
      if (!state.verdict) {
        const started = (state as DebateState & { judgeStarted?: number }).judgeStarted ?? 0;
        if (!started || Date.now() - started > 25_000) {
          (state as DebateState & { judgeStarted?: number }).judgeStarted = Date.now();
          void runJudge(match);
        }
      }
      return;
    }
    const seat = currentDebateSeat(state);
    if (!seat) return;
    const player = match.players.find((p) => p.id === seat.playerId);
    if (!player) return;
    const expired = now >= state.windowEndsAt;
    const botReady =
      player.controller === "bot" && now > (match.startedAt ?? now) && state.windowEndsAt - now < debateWindowMs(state, seat.kind) - 3500;
    if (expired) {
      log(match, "system", `${player.name} let the ${seat.kind} window close in silence.`, player.id);
      advanceDebate(match);
      return;
    }
    if (botReady && !state.speeches.some((s) => s.playerId === player.id && s.round === seat.kind)) {
      applyDebate(match, player, "submit", {
        type: "submit",
        text: botDebateText(seat.kind, state.topic, player.name),
      });
    }
    return;
  }

  if (match.gameId === "coinpump") {
    const state = match.state as CoinPumpState;
    if (state.resolved) return;
    if (now - ((state as CoinPumpState & { lastQuoteAt?: number }).lastQuoteAt ?? 0) > QUOTE_REFRESH_MS) {
      (state as CoinPumpState & { lastQuoteAt?: number }).lastQuoteAt = now;
      await refreshQuotes(state);
    }
    if (now < state.lockAt) {
      for (const p of match.players) {
        if (p.controller !== "bot") continue;
        if (state.picks[p.id]) continue;
        if (state.lockAt - now < 20_000 || Math.random() < 0.25) {
          const coinId = botPick(state, p.id);
          applyCoinPump(match, p, "pick", { type: "pick", coinId });
        }
      }
    }
    if (now >= state.windowEndsAt) {
      await refreshQuotes(state);
      const { ranking, winnerCoinIds } = resolveCoinPump(state);
      const top = ranking[0];
      const topCoin = state.coins.find((c) => c.id === top?.id);
      log(
        match,
        "system",
        `Window closed. Top tape: ${topCoin?.ticker ?? "?"} ${top && top.changePct >= 0 ? "+" : ""}${top?.changePct.toFixed(3)}%.`,
      );
      for (const c of state.coins) {
        const pct = c.changePct ?? 0;
        log(
          match,
          "system",
          `${c.ticker} ${pct >= 0 ? "+" : ""}${pct.toFixed(3)}%  ($${c.startUsd.toFixed(c.startUsd < 2 ? 4 : 2)} → $${(c.endUsd ?? c.liveUsd).toFixed(c.endUsd && c.endUsd < 2 ? 4 : 2)})`,
        );
      }
      const winners = match.players.filter((p) => winnerCoinIds.includes(state.picks[p.id] ?? "")).map((p) => p.id);
      if (winners.length === 0) {
        log(match, "win", "Nobody picked the top tape. Pot stays in the treasury.");
        finishMatch(match, []);
      } else {
        const names = winners.map((id) => playerName(match, id)).join(", ");
        log(match, "win", `${names} called it.`);
        finishMatch(match, winners);
      }
    }
    return;
  }

  if (match.gameId === "rps") {
    const state = match.state as RpsState;
    const round = state.rounds[state.roundIndex];
    if (!round || round.resolved) {
      if (round?.resolved && match.status === "playing") {
        await forceSettle(match);
      }
      return;
    }
    for (const p of match.players) {
      if (round.throws[p.id]) continue;
      const taped = state.tape?.[p.id]?.[state.roundIndex];
      if (taped) {
        applyRps(match, p, "throw", { type: "throw", gesture: taped }, p.walletId);
        continue;
      }
      if (p.controller !== "bot") continue;
      if (state.windowEndsAt - now < THROW_WINDOW_MS - 400) {
        applyRps(match, p, "throw", { type: "throw", gesture: botGesture(state, p.id) }, p.walletId);
      }
    }
    if (now >= state.windowEndsAt) {
      resolveRpsRound(match);
    }
    return;
  }

  if (match.gameId === "dilemma") {
    const state = match.state as DilemmaState;
    const round = state.rounds[state.roundIndex];
    if (!round || round.resolved) {
      if (round?.resolved && match.status === "playing") {
        await forceSettle(match);
      }
      return;
    }
    for (const p of match.players) {
      if (round.sealed[p.id]) continue;
      const taped = state.tape?.[p.id]?.[state.roundIndex];
      if (taped) {
        applyDilemma(match, p, "choose", { type: "choose", move: taped });
        continue;
      }
      if (p.controller !== "bot") continue;
      if (state.windowEndsAt - now < CHOOSE_WINDOW_MS - DILEMMA_BOT_DELAY_MS) {
        applyDilemma(match, p, "choose", {
          type: "choose",
          move: botDilemmaMove(state, p.id, match.players),
        });
      }
    }
    if (now >= state.windowEndsAt) {
      resolveDilemmaRound(match);
    }
    return;
  }

  if (match.gameId === "target") {
    const state = match.state as TargetState;
    if (state.resolved) return;
    for (const p of match.players) {
      if (p.controller !== "bot") continue;
      if (state.locks[p.id] != null) continue;
      if (state.windowEndsAt - now < TARGET_WINDOW_MS - TARGET_BOT_DELAY_MS) {
        applyTarget(match, p, "lock", { type: "lock", value: botTargetLock(p.id) });
      }
    }
    if (now >= state.windowEndsAt) {
      resolveTarget(match);
    }
  }
}

export async function recentTape(
  limit = 12,
): Promise<{ matchId: string; gameId: GameId; line: string; ts: number }[]> {
  await ready();
  const out: { matchId: string; gameId: GameId; line: string; ts: number }[] = [];
  for (const m of getWorld().matches.values()) {
    for (const l of m.logs.slice(-6)) {
      out.push({ matchId: m.id, gameId: m.gameId, line: l.text, ts: l.ts });
    }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, limit);
}
