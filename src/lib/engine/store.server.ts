import { legalActionsFor } from "@/lib/games";
import {
  botPick,
  createCoinPumpState,
  fetchQuotes,
  QUOTE_REFRESH_MS,
  refreshQuotes,
  resolveCoinPump,
  type CoinPumpState,
} from "@/lib/games/coinpump";
import {
  botDebateText,
  createDebateState,
  currentDebateSeat,
  ROUND_MS,
  ROUND_SEQUENCE,
  type DebateState,
} from "@/lib/games/debate";
import { debateWinners, judgeDebate } from "@/lib/games/judge.server";
import {
  botGesture,
  createRpsState,
  GESTURES,
  nextRpsRound,
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
import { catalogById, BOT_NAMES, CATALOG } from "./catalog";
import { GAME_PREFIX, shortId, uid } from "./ids";
import {
  type ActionResult,
  type AgentAction,
  type Controller,
  type GameId,
  type LedgerEntry,
  type LogKind,
  type Match,
  type Player,
  type PlayerTint,
  type PublicMatch,
  type Wallet,
} from "./types";
import { credit, debit, parsePaymentHeader, PayError, paymentAccept } from "@/lib/x402/pay.server";
import { formatUsdc } from "@/lib/utils";
import { deleteMatch, loadAll, saveHouseBots, saveLedger, saveMatch, saveWallet } from "./persist.server";

const TINTS: PlayerTint[] = ["p1", "p2", "p3", "p4", "p5", "p6"];
const STARTING_BALANCE = 5_000_000;

const BOT_FILL: Record<string, number> = {
  snakes: 4,
  debate: 2,
  coinpump: 4,
  rps: 3,
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
      dirtyWallets: new Set(),
      dirtyMatches: new Set(),
      pendingLedger: [],
      houseBots: false,
    };
  }
  if (typeof g.__px402d.houseBots !== "boolean") g.__px402d.houseBots = false;
  return g.__px402d;
}

async function ready(): Promise<World> {
  const world = getWorld();
  if (world.hydrated) return world;
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
  if (world.houseBots) await ensureHouseTable();
  await flush();
  startTicker();
}

function seedBots(world: World) {
  for (const name of BOT_NAMES) {
    const id = name.toLowerCase();
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
  world.dirtyWallets.clear();
  world.dirtyMatches.clear();
  for (const id of walletIds) {
    const w = world.wallets.get(id);
    if (w) await saveWallet(w);
  }
  for (const id of matchIds) {
    const m = world.matches.get(id);
    if (m) await saveMatch(m);
  }
  for (const e of ledger) await saveLedger(e);
}

let tickChain: Promise<void> = Promise.resolve();
let inTick = false;

export async function tickFloor(): Promise<void> {
  await ready();
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
  await createMatchInternal({ gameId: "snakes", withBots: true, fill: 4, fillNow: true });
}

async function pruneFinished() {
  const world = getWorld();
  const finished = [...world.matches.values()]
    .filter((m) => m.status === "finished")
    .sort((a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt));
  if (finished.length <= 40) return;
  const drop = finished.slice(40);
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
  return [...world.wallets.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getWallet(id: string): Promise<Wallet | undefined> {
  const world = await ready();
  return world.wallets.get(id);
}

export async function createWallet(name: string): Promise<Wallet> {
  const world = await ready();
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) throw new Error("Name is required");
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
  await flush();
  return wallet;
}

export async function listMatches(): Promise<Match[]> {
  await tickFloor();
  return [...getWorld().matches.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMatch(id: string): Promise<Match | undefined> {
  await tickFloor();
  return getWorld().matches.get(id);
}

export function toPublic(match: Match, agentId?: string): PublicMatch {
  const you = agentId ? match.players.find((p) => p.id === agentId) : undefined;
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
    state: match.state,
    logs: match.logs,
    winners: match.winners,
    payouts: match.payouts,
    you,
    legalActions: agentId ? legalActionsFor(match, agentId) : undefined,
    next:
      match.status === "finished"
        ? "stop"
        : match.status === "lobby"
          ? "wait"
          : agentId && (legalActionsFor(match, agentId).length > 0)
            ? "act"
            : "wait",
    settlement:
      match.status === "finished"
        ? {
            closed: true,
            rematch: false,
            winners: match.winners.map((id) => ({
              id,
              name: playerName(match, id),
              amount: match.payouts.find((p) => p.playerId === id)?.amount ?? 0,
            })),
          }
        : undefined,
  };
}

async function createMatchInternal(opts: {
  gameId: GameId;
  withBots?: boolean;
  fill?: number;
  fillNow?: boolean;
}): Promise<Match> {
  const allowBots = getWorld().houseBots && Boolean(opts.withBots);
  const spec = catalogById(opts.gameId);
  const match: Match = {
    id: shortId(GAME_PREFIX[opts.gameId] ?? "gm"),
    gameId: opts.gameId,
    status: "lobby",
    players: [],
    minPlayers: spec.minPlayers,
    maxPlayers: spec.maxPlayers,
    entryFee: spec.entryFee,
    prizePool: 0,
    withBots: allowBots,
    createdAt: Date.now(),
    state: {},
    logs: [],
    winners: [],
    payouts: [],
  };
  getWorld().matches.set(match.id, match);
  log(
    match,
    "system",
    `Table ${match.id} opened for ${spec.name}. Entry ${formatUsdc(spec.entryFee)}. Need ${spec.minPlayers}–${spec.maxPlayers} agents.`,
  );

  // House exhibition (fillNow): sit bots and start. Agent-created withBots
  // tables leave seats empty so the creator can /join first.
  if (allowBots && opts.fillNow) {
    fillBots(match, botFillTarget(opts.gameId, spec.maxPlayers, opts.fill));
    if (match.players.length >= spec.minPlayers) {
      await startMatch(match);
    }
  }
  touchMatch(match);
  return match;
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
  if (!getWorld().houseBots) return;
  while (match.players.length < target) {
    const w = unusedBot(match);
    if (!w) break;
    seatPlayer(match, w, "bot");
  }
}

export async function addBots(matchId: string, count = 2): Promise<Match> {
  await ready();
  const match = mustMatch(matchId);
  if (match.status !== "lobby") throw new Error("Table already underway");
  fillBots(match, Math.min(match.players.length + count, match.maxPlayers));
  if (match.players.length >= match.minPlayers) await startMatch(match);
  await flush();
  return match;
}

function mustMatch(id: string): Match {
  const m = getWorld().matches.get(id);
  if (!m) throw new Error("Table not found");
  return m;
}

function mustWallet(id: string): Wallet {
  const w = getWorld().wallets.get(id);
  if (!w) throw new Error("Wallet not found");
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
  paymentHeader?: string | null;
  controller?: Controller;
}): Promise<ActionResult> {
  await ready();
  const match = mustMatch(opts.matchId);
  if (match.status !== "lobby") {
    return { ok: false, error: "Table is not in lobby" };
  }
  const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId);
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
    const wallet = mustWallet(parsed.walletId);
    seatPlayer(match, wallet, opts.controller ?? "human");
    if (match.withBots) {
      fillBots(match, botFillTarget(match.gameId, match.maxPlayers));
    }
    if (
      match.players.length >= match.maxPlayers ||
      (match.withBots && match.players.length >= match.minPlayers)
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
  if (match.players.length < match.minPlayers) return;

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
      const state = createDebateState(match.players, Date.now());
      match.state = state;
      const seat = currentDebateSeat(state);
      match.currentPlayerId = seat?.playerId;
      match.turnDeadline = state.windowEndsAt;
      log(match, "system", `Motion: ${state.topic}`);
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
      log(match, "system", "Round 1 of 5. Throw rock, paper, or scissors.");
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
    log(match, "win", "No winner. Pot stays in the treasury.");
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
  paymentHeader?: string | null;
  action: AgentAction;
}): Promise<ActionResult> {
  await ready();
  const match = mustMatch(opts.matchId);
  if (match.status === "finished") {
    return { ok: false, error: "Table is closed. No rematch — open a new table from the floor." };
  }
  if (match.status !== "playing") return { ok: false, error: "Match is not live" };
  const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId);
  const walletId = (opts.walletId && opts.walletId.trim()) || parsed?.walletId;
  if (!walletId) {
    return { ok: false, error: "Send walletId in JSON. X-PAYMENT is only for join and paid extras." };
  }
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
  if (match.currentPlayerId !== player.id) throw new Error("Not your turn");
  if (type !== "roll") throw new Error("Send { type: \"roll\" } with optional powerup");
  const powerupRaw = action.powerup ?? action.option;
  const powerup =
    powerupRaw === "reroll" || powerupRaw === "ward" ? (powerupRaw as "reroll" | "ward") : undefined;
  if (powerup === "reroll") {
    requirePaid(match, player, header, REROLL_FEE, "reroll", "re-roll");
  }
  if (powerup === "ward") {
    requirePaid(match, player, header, WARD_FEE, "ward", "snake ward");
  }
  const state = match.state as SnakesState;
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
  const text = String(action.text ?? "").trim();
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
  state.windowEndsAt = Date.now() + ROUND_MS[kind];
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
  });
  state.scores = result.scores;
  state.verdict = result.verdict;
  state.judging = false;
  log(match, "judge", result.verdict);
  for (const p of match.players) {
    const s = result.scores[p.id];
    if (s) log(match, "judge", `${p.name}: ${s.total}/10 — ${s.notes}`, p.id);
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
  if (type !== "throw") throw new Error("Send { type: \"throw\", gesture: \"rock\" }");
  const gesture = String(action.gesture ?? action.option ?? "") as Gesture;
  if (!GESTURES.includes(gesture)) throw new Error("gesture must be rock, paper, or scissors");
  if (round.throws[player.id]) throw new Error("Already thrown this round");
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

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
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
    const hasGuest = match.players.some((p) => p.controller !== "bot");
    // Never fill an empty withBots lobby — the creator still needs a seat.
    if (match.withBots && hasGuest && match.players.length < match.maxPlayers) {
      fillBots(match, botFillTarget(match.gameId, match.maxPlayers));
    }
    if (match.players.length >= match.minPlayers) {
      const lastJoin = Math.max(...match.players.map((p) => p.joinedAt), match.createdAt);
      const waitMs = match.withBots ? 800 : 8_000;
      if (now - lastJoin > waitMs || match.players.length >= match.maxPlayers) {
        await startMatch(match);
      }
    }
  }
  if (match.status !== "playing") return;

  if (match.gameId === "snakes") {
    const current = match.players.find((p) => p.id === match.currentPlayerId);
    if (!current) return;
    const due = (match.turnDeadline ?? 0) <= now;
    const botReady = current.controller === "bot" && (match.turnDeadline ?? 0) - now < SNAKES_TURN_MS - SNAKES_BOT_DELAY_MS;
    if (due && current.controller !== "bot") {
      log(match, "system", `${current.name} missed the window. The dice pass.`, current.id);
      advanceSnakesTurn(match);
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
      player.controller === "bot" && now > (match.startedAt ?? now) && state.windowEndsAt - now < ROUND_MS[seat.kind] - 3500;
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
    if (!round || round.resolved) return;
    for (const p of match.players) {
      if (p.controller !== "bot") continue;
      if (round.throws[p.id]) continue;
      if (state.windowEndsAt - now < THROW_WINDOW_MS - 400) {
        applyRps(match, p, "throw", { type: "throw", gesture: botGesture(state, p.id) }, p.walletId);
      }
    }
    if (now >= state.windowEndsAt) {
      resolveRpsRound(match);
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
